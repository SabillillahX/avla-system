import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// ---------------------------------------------------------------------------
// Environment & Constants
// ---------------------------------------------------------------------------

const ENV = {
    geminiApiKey: process.env.GEMINI_API ?? "",
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
    allowedOrigins: process.env.ALLOWED_ORIGINS ?? "",
    port: Number(process.env.PORT ?? 8081),
} as const;

const REQUIRED_ENV_KEYS = ["geminiApiKey", "backendUrl"] as const;

for (const key of REQUIRED_ENV_KEYS) {
    if (!ENV[key]) {
        console.error(`[Config] Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

const DEFAULT_QUIZ_INTERVAL_SECONDS = 3 * 60; // 3 minutes

const ALLOWED_ORIGINS: string[] = Array.from(
    new Set([
        ...ENV.allowedOrigins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedQuiz {
    question: string;
    options: [string, string, string, string];
    correct_answer: string;
    explanation: string;
}

interface TranscriptSegment {
    text: string;
    end: number;
}

interface TranscriptChunk {
    trigger_time: number;
    text: string;
}

interface NotificationPayload {
    event: string;
    video_id?: string | number;
    message?: string;
    progress?: number;
    processed_chunks?: number;
    total_chunks?: number;
    saved_count?: number;
}

type UnknownRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// In-Memory Stores
// ---------------------------------------------------------------------------

const activeSSESessions = new Map<string, SSEServerTransport>();
const notificationClientsByUserId = new Map<string, Response>();

/**
 * Buffer for notifications that arrived before the client connected (or while
 * it was reconnecting). Each entry is TTL-bound so stale events are not
 * replayed to a client that reconnects much later.
 */
const PENDING_NOTIFICATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface BufferedNotification {
    payload: NotificationPayload;
    expiresAt: number;
}

const pendingNotificationsByUserId = new Map<string, BufferedNotification[]>();

function bufferNotificationForUser(userId: string, payload: NotificationPayload): void {
    const existing = pendingNotificationsByUserId.get(userId) ?? [];
    existing.push({ payload, expiresAt: Date.now() + PENDING_NOTIFICATION_TTL_MS });
    pendingNotificationsByUserId.set(userId, existing);
}

function flushPendingNotifications(userId: string, client: Response): void {
    const pending = pendingNotificationsByUserId.get(userId);
    if (!pending?.length) return;

    const now = Date.now();
    const stillValid = pending.filter((entry) => entry.expiresAt > now);

    stillValid.forEach((entry) => {
        client.write(`data: ${JSON.stringify(entry.payload)}\n\n`);
    });

    pendingNotificationsByUserId.delete(userId);

    if (stillValid.length > 0) {
        console.log(`[Notifications] Flushed ${stillValid.length} buffered event(s) to userId=${userId}`);
    }
}

// ---------------------------------------------------------------------------
// Notification Emitter
// ---------------------------------------------------------------------------

function emitNotificationToUser(userId: string, payload: NotificationPayload): void {
    const client = notificationClientsByUserId.get(userId);

    if (!client) {
        // Client is offline or reconnecting — buffer the event so it is delivered
        // automatically the moment the client re-establishes its SSE connection.
        bufferNotificationForUser(userId, payload);
        console.log(`[Notifications] userId=${userId} offline — buffered event "${payload.event}"`);
        return;
    }

    client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ---------------------------------------------------------------------------
// Gemini API
// ---------------------------------------------------------------------------

async function callGeminiApi(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${ENV.geminiApiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "Unknown error");
        throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";
}

// ---------------------------------------------------------------------------
// Quiz Parsing Utilities
// ---------------------------------------------------------------------------

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function stripOptionPrefix(value: string): string {
    return value
        .replace(/^\s*[-*]\s+/, "")
        .replace(/^\s*[A-Da-d][\).:\-]\s+/, "")
        .replace(/^\s*\d+[\).:\-]\s+/, "")
        .trim();
}

function stripWrappingQuotes(value: string): string {
    return value.replace(/^['"`]+|['"`]+$/g, "").trim();
}

function normalizeOptionText(value: string): string {
    return normalizeWhitespace(stripWrappingQuotes(stripOptionPrefix(value)));
}

function normalizeForComparison(value: string): string {
    return normalizeOptionText(value).toLowerCase();
}

function resolveCorrectAnswerText(
    rawCorrectAnswer: string,
    normalizedOptions: string[]
): string | null {
    const normalizedAnswer = normalizeForComparison(rawCorrectAnswer);
    if (!normalizedAnswer) return null;

    // Exact text match
    const exactMatch = normalizedOptions.find(
        (option) => normalizeForComparison(option) === normalizedAnswer
    );
    if (exactMatch) return exactMatch;

    // Label-only match: "A", "B", "Option C", etc.
    const labelMatch = normalizedAnswer.match(/(?:option\s*)?([a-d])/i);
    if (labelMatch) {
        const index = labelMatch[1].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
        if (index >= 0 && index < normalizedOptions.length) {
            return normalizedOptions[index];
        }
    }

    return null;
}

function resolveCorrectAnswer(
    rawValue: unknown,
    normalizedOptions: string[]
): string | null {
    if (typeof rawValue === "number" && Number.isInteger(rawValue)) {
        const index = rawValue - 1;
        return index >= 0 && index < normalizedOptions.length
            ? normalizedOptions[index]
            : null;
    }

    if (typeof rawValue === "string") {
        return resolveCorrectAnswerText(rawValue, normalizedOptions);
    }

    return null;
}

function extractNestedCandidateObjects(input: unknown): UnknownRecord[] {
    if (!input || typeof input !== "object") return [];

    const root = input as UnknownRecord;
    const candidates: UnknownRecord[] = [root];

    for (const key of ["quiz", "result", "data", "item", "question_data", "mcq"]) {
        const value = root[key];
        if (value && typeof value === "object" && !Array.isArray(value)) {
            candidates.push(value as UnknownRecord);
        }
    }

    for (const key of ["quizzes", "questions", "items"]) {
        const value = root[key];
        if (Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (firstItem && typeof firstItem === "object") {
                candidates.push(firstItem as UnknownRecord);
            }
        }
    }

    return candidates;
}

function coerceQuizFromObject(rawObject: unknown): ParsedQuiz | null {
    const candidates = extractNestedCandidateObjects(rawObject);

    for (const candidate of candidates) {
        const rawQuestion = candidate.question;
        const rawOptions = candidate.options;
        const rawCorrectAnswer =
            candidate.correct_answer ??
            candidate.correctAnswer ??
            candidate.answer ??
            candidate.correctOption;
        const rawExplanation = candidate.explanation;

        if (typeof rawQuestion !== "string" || !rawQuestion.trim()) continue;
        if (!Array.isArray(rawOptions) || rawOptions.length < 2) continue;

        const normalizedOptions = rawOptions
            .filter((opt): opt is string => typeof opt === "string" && !!opt.trim())
            .map(normalizeOptionText)
            .filter(Boolean)
            .slice(0, 4);

        if (normalizedOptions.length !== 4) continue;

        const correctAnswer = resolveCorrectAnswer(rawCorrectAnswer, normalizedOptions);
        if (!correctAnswer) continue;

        return {
            question: normalizeWhitespace(rawQuestion),
            options: normalizedOptions as [string, string, string, string],
            correct_answer: correctAnswer,
            explanation:
                typeof rawExplanation === "string" ? normalizeWhitespace(rawExplanation) : "",
        };
    }

    return null;
}

function extractFirstJsonObject(input: string): string | null {
    let inString = false;
    let isEscaped = false;
    let depth = 0;
    let startIndex = -1;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (isEscaped) { isEscaped = false; continue; }
        if (char === "\\") { isEscaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (char === "{") {
            if (depth === 0) startIndex = i;
            depth++;
        } else if (char === "}") {
            depth--;
            if (depth === 0 && startIndex !== -1) {
                return input.slice(startIndex, i + 1);
            }
        }
    }

    return null;
}

function parseQuizFromLlmOutput(rawOutput: string): ParsedQuiz | null {
    const cleaned = rawOutput.replace(/```json/gi, "").replace(/```/g, "").trim();
    const candidates = [cleaned, extractFirstJsonObject(cleaned)].filter(
        (v): v is string => Boolean(v)
    );

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const coerced = coerceQuizFromObject(parsed);
            if (coerced) return coerced;
        } catch {
            // Try the next candidate.
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Transcript Chunking
// ---------------------------------------------------------------------------

function chunkTranscriptByTime(
    segments: TranscriptSegment[],
    intervalSeconds: number
): TranscriptChunk[] {
    const chunks: TranscriptChunk[] = [];
    let currentText = "";
    let nextCheckpointSeconds = intervalSeconds;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentText += segment.text + " ";

        const isLastSegment = i === segments.length - 1;
        if (segment.end >= nextCheckpointSeconds || isLastSegment) {
            chunks.push({
                trigger_time: Math.round(segment.end),
                text: currentText.trim(),
            });
            currentText = "";
            nextCheckpointSeconds = segment.end + intervalSeconds;
        }
    }

    return chunks;
}

// ---------------------------------------------------------------------------
// Quiz Generation Prompt
// ---------------------------------------------------------------------------

function buildQuizGenerationPrompt(transcriptText: string): string {
    return `You are an E-Learning Instructional Designer and a Professional Educator.

Your task is to create exactly 1 (one) multiple-choice question based on the following chunk of text from an educational video transcript.

Context: This question will appear as a "Pop-Up Quiz" that automatically pauses the video. The goal is to test the student's immediate focus and understanding of the concept that was *just* explained in this specific text chunk.

Requirements:
1. The question must be clear, concise, and relevant to the provided text.
2. Provide exactly 4 reasonable answer options, without A/B/C/D labels inside the option text.
3. The correct answer text must exactly match one of the provided options.
4. Provide a brief explanation of why the answer is correct, used as adaptive feedback.

RETURN ONLY A VALID JSON OBJECT — NO MARKDOWN, NO PREAMBLE:
{
  "question": "Write the question here?",
  "options": ["First option", "Second option", "Third option", "Fourth option"],
  "correct_answer": "The correct option text",
  "explanation": "Explanation of why this option is correct."
}

Video Transcript:
"""
${transcriptText}
"""`;
}

// ---------------------------------------------------------------------------
// MCP Server & Tools
// ---------------------------------------------------------------------------

function buildAuthHeaders(token: string): Record<string, string> {
    return {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
    };
}

function createMcpServer(): McpServer {
    const server = new McpServer({
        name: "MCP Server",
        version: "1.0.0",
    });

    // Tool: getCurrentUser
    server.tool(
        "getCurrentUser",
        "Get information about the currently logged-in user",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
        },
        async ({ token }) => {
            const response = await fetch(`${ENV.backendUrl}/me`, {
                method: "GET",
                headers: buildAuthHeaders(token),
            });

            if (!response.ok) {
                return {
                    content: [{ type: "text", text: `Failed to fetch user: HTTP ${response.status}` }],
                };
            }

            const userData = await response.json();
            return {
                content: [{ type: "text", text: `User details: ${JSON.stringify(userData)}` }],
            };
        }
    );

    // Tool: analyzeVideoAudioPaths
    server.tool(
        "analyzeVideoAudioPaths",
        "Fetch user's video data and use Gemini to answer questions about their audio paths",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
            prompt: z.string().describe("Question or instruction for Gemini about the audio path data"),
        },
        async ({ token, prompt }) => {
            const response = await fetch(`${ENV.backendUrl}/videos`, {
                method: "GET",
                headers: buildAuthHeaders(token),
            });

            if (!response.ok) {
                return {
                    content: [{ type: "text", text: `Failed to fetch videos: HTTP ${response.status}` }],
                };
            }

            const jsonBody = await response.json();
            const videoList = jsonBody.data?.data ?? jsonBody.data ?? [];

            const audioPathData = videoList.map((video: UnknownRecord) => ({
                id: video.id,
                title: video.title,
                audio_path: video.mp3_audio_path ?? null,
            }));

            const fullPrompt = `Here is the user's video audio path data:\n${JSON.stringify(audioPathData, null, 2)}\n\nTask: ${prompt}\n\nAnalyze strictly based on the provided data.`;
            const aiAnswer = await callGeminiApi(fullPrompt);

            return { content: [{ type: "text", text: aiAnswer }] };
        }
    );

    // Tool: generateAdaptiveVideoQuizzes
    server.tool(
        "generateAdaptiveVideoQuizzes",
        "Generate adaptive multiple-choice quizzes from video transcripts, chunked by time intervals",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
            userId: z.union([z.number(), z.string()]).describe("User ID for realtime progress notifications"),
            videoId: z.union([z.number(), z.string()]).describe("ID of the target video"),
            intervalMinutes: z
                .number()
                .optional()
                .describe("Quiz popup interval in minutes (default: 3)"),
        },
        async ({ token, userId, videoId, intervalMinutes }) => {
            const intervalSeconds = (intervalMinutes ?? 3) * 60;
            const userIdStr = String(userId);

            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_started",
                video_id: videoId,
                message: "Memulai pembuatan kuis adaptif...",
                progress: 0,
            });

            // 1. Fetch transcript
            const transcriptResponse = await fetch(
                `${ENV.backendUrl}/videos/${videoId}/transcript`,
                { method: "GET", headers: buildAuthHeaders(token) }
            );

            if (!transcriptResponse.ok) {
                const errorText = await transcriptResponse.text();
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: `Gagal mengambil transkrip: ${transcriptResponse.status}`,
                });
                return {
                    content: [{ type: "text", text: `Failed to fetch transcript: ${transcriptResponse.status} - ${errorText}` }],
                };
            }

            const transcriptBody = await transcriptResponse.json();
            const transcriptSegments: TranscriptSegment[] = transcriptBody.data ?? [];

            if (transcriptSegments.length === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: "Transkrip video kosong, kuis tidak bisa dibuat.",
                });
                return { content: [{ type: "text", text: "No transcript segments found." }] };
            }

            // 2. Chunk transcript by time
            const transcriptChunks = chunkTranscriptByTime(
                transcriptSegments,
                intervalSeconds === 0 ? DEFAULT_QUIZ_INTERVAL_SECONDS : intervalSeconds
            );

            // 3. Generate quizzes per chunk
            const generatedQuizzes: (ParsedQuiz & { trigger_time: number })[] = [];
            let failedChunkCount = 0;
            let lastErrorMessage = "Format kuis dari AI tidak valid.";
            const totalChunks = transcriptChunks.length;

            for (let chunkIndex = 0; chunkIndex < transcriptChunks.length; chunkIndex++) {
                const chunk = transcriptChunks[chunkIndex];
                if (!chunk.text) continue;

                try {
                    const rawLlmOutput = await callGeminiApi(buildQuizGenerationPrompt(chunk.text));
                    let parsedQuiz = parseQuizFromLlmOutput(rawLlmOutput);

                    // Attempt self-repair if initial parse fails
                    if (!parsedQuiz) {
                        const repairPrompt = `Convert the following into valid JSON only — no markdown, no preamble:
{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correct_answer": "...",
  "explanation": "..."
}

Input to fix:
${rawLlmOutput}`;
                        const repairedOutput = await callGeminiApi(repairPrompt);
                        parsedQuiz = parseQuizFromLlmOutput(repairedOutput);
                    }

                    if (!parsedQuiz) {
                        throw new Error("Unable to extract a valid quiz format from LLM output.");
                    }

                    generatedQuizzes.push({ ...parsedQuiz, trigger_time: chunk.trigger_time });
                } catch (error) {
                    failedChunkCount++;
                    lastErrorMessage =
                        error instanceof Error ? error.message : "Unknown error during quiz generation.";
                } finally {
                    const processedChunks = chunkIndex + 1;
                    const progressPercent = Math.min(95, Math.round((processedChunks / totalChunks) * 100));

                    emitNotificationToUser(userIdStr, {
                        event: "quiz_generation_progress",
                        video_id: videoId,
                        processed_chunks: processedChunks,
                        total_chunks: totalChunks,
                        progress: progressPercent,
                        message: `Memproses ${processedChunks}/${totalChunks} potongan transkrip...`,
                    });
                }
            }

            if (generatedQuizzes.length === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: `Gagal membuat kuis: ${lastErrorMessage} (${totalChunks - failedChunkCount}/${totalChunks} chunk valid)`,
                });
                return {
                    content: [{ type: "text", text: `Quiz generation failed. Detail: ${lastErrorMessage}` }],
                };
            }

            // 4. Save quizzes to backend
            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_saving",
                video_id: videoId,
                progress: 97,
                message: "Menyimpan kuis ke server...",
            });

            const saveResponse = await fetch(`${ENV.backendUrl}/videos/${videoId}/quizzes`, {
                method: "POST",
                headers: buildAuthHeaders(token),
                body: JSON.stringify({ quizzes: generatedQuizzes }),
            });

            if (!saveResponse.ok) {
                const saveErrorText = await saveResponse.text();
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: `Gagal menyimpan kuis: ${saveResponse.status}`,
                });
                return {
                    content: [{ type: "text", text: `Failed to save quizzes: ${saveResponse.status} - ${saveErrorText}` }],
                };
            }

            const saveResult = await saveResponse.json();
            const savedQuizCount = saveResult.saved_count ?? generatedQuizzes.length;

            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_completed",
                video_id: videoId,
                progress: 100,
                saved_count: savedQuizCount,
                message: "Kuis berhasil dibuat dan disimpan.",
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Done! Successfully created ${savedQuizCount} quizzes from the video transcript.`,
                    },
                ],
            };
        }
    );

    return server;
}

// ---------------------------------------------------------------------------
// Express App & CORS
// ---------------------------------------------------------------------------

const app = express();

const corsOptions: cors.CorsOptions = {
    origin: (requestOrigin, callback) => {
        if (!requestOrigin || ALLOWED_ORIGINS.includes(requestOrigin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin not allowed: ${requestOrigin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "mcp-protocol-version"],
};

app.use(cors(corsOptions));
app.options("/{*path}", cors(corsOptions));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveAllowedOriginHeader(requestOrigin: string | undefined): string {
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
    return ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// SSE: Realtime notifications per user
app.get("/notifications", (req: Request, res: Response) => {
    const userId = req.query.userId as string;

    if (!userId) {
        res.status(400).json({ error: "Missing required query parameter: userId" });
        return;
    }

    const allowedOrigin = resolveAllowedOriginHeader(req.headers.origin);

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
    });

    res.write(":\n\n"); // Initial SSE comment to open the stream

    notificationClientsByUserId.set(userId, res);
    console.log(`[Notifications] Client connected: userId=${userId}`);

    // Deliver any events that arrived while the client was offline / reconnecting.
    flushPendingNotifications(userId, res);

    const heartbeatInterval = setInterval(() => {
        res.write("event: ping\ndata: {}\n\n");
    }, 15_000);

    req.on("close", () => {
        clearInterval(heartbeatInterval);
        notificationClientsByUserId.delete(userId);
        console.log(`[Notifications] Client disconnected: userId=${userId}`);
    });
});

// Webhook: Called by backend when transcription is ready
app.post("/webhook/transcription-done", express.json(), (req: Request, res: Response) => {
    const { video_id, user_id, status } = req.body ?? {};

    if (!video_id || !user_id || !status) {
        res.status(400).json({ error: "Missing required fields: video_id, user_id, status" });
        return;
    }

    if (status === "completed") {
        emitNotificationToUser(String(user_id), {
            event: "transcription_ready",
            video_id,
        });
        console.log(`[Webhook] transcription_ready sent: videoId=${video_id}, userId=${user_id}`);
    }

    res.status(200).json({ received: true });
});

// SSE: MCP session endpoint
app.get("/sse", async (req: Request, res: Response) => {
    const allowedOrigin = resolveAllowedOriginHeader(req.headers.origin);
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");

    const transport = new SSEServerTransport("/messages", res);
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);

    activeSSESessions.set(transport.sessionId, transport);
    console.log(`[SSE] Session opened: ${transport.sessionId}`);

    req.on("close", () => {
        activeSSESessions.delete(transport.sessionId);
        console.log(`[SSE] Session closed: ${transport.sessionId}`);
    });
});

// POST: MCP message handler for a given session
app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = activeSSESessions.get(sessionId);

    if (!transport) {
        res.status(404).json({ error: "Session not found or expired." });
        return;
    }

    try {
        await transport.handlePostMessage(req, res);
    } catch (error) {
        console.error(`[SSE] Error handling message for session ${sessionId}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error while handling message." });
        }
    }
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

app.listen(ENV.port, "0.0.0.0", () => {
    console.log(`[Server] MCP SSE Server running on http://0.0.0.0:${ENV.port}`);
    console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});