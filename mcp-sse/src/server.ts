import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { ENV, ALLOWED_ORIGINS } from "./utils/helper.js";
import {
    NotificationPayload,
    ParsedQuiz,
    AssessmentQuestion,
    TranscriptSegment,
    TranscriptChunk,
    UnknownRecord,
    SemanticAssessmentQuestion
} from "./utils/interface.js";
import { parseQuizFromLlmOutput, parseAssessmentFromLlmOutput, parseSemanticAssessmentFromLlmOutput } from "./utils/helper.js";

// In memory stores
const activeSSESessions = new Map<string, SSEServerTransport>();
const notificationClientsByUserId = new Map<string, Response>();

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

function emitNotificationToUser(userId: string, payload: NotificationPayload): void {
    const client = notificationClientsByUserId.get(userId);

    if (!client) {
        bufferNotificationForUser(userId, payload);
        console.log(`[Notifications] userId=${userId} offline — buffered event "${payload.event}"`);
        return;
    }

    client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function callGeminiApi(prompt: string, expectJson: boolean = true): Promise<string> {
    // Pastikan menggunakan model flash yang terbaru dan efisien
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${ENV.geminiApiKey}`;

    // Siapkan payload standar
    const payload: any = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    // 🌟 PERUBAHAN 1: Paksa respons berupa JSON murni agar tidak ada error 500 di Laravel
    if (expectJson) {
        payload.generationConfig = {
            responseMimeType: "application/json",
        };
    }

    const maxRetries = 3;
    let delayMs = 2000; // Mulai dengan jeda 2 detik jika gagal

    // 🌟 PERUBAHAN 2: Exponential Backoff Loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text ?? (expectJson ? "[]" : "");
            }

            // Jika kena Rate Limit (429) atau Server Overloaded (503)
            if (response.status === 429 || response.status >= 500) {
                if (attempt === maxRetries) {
                    throw new Error(`Gemini API terus menolak setelah ${maxRetries} percobaan (HTTP ${response.status}).`);
                }

                console.warn(`[Gemini] Server sibuk (HTTP ${response.status}). Menunggu ${delayMs / 1000} detik sebelum mencoba lagi... (Upaya ${attempt}/${maxRetries})`);

                // Jeda (Sleep)
                await new Promise(resolve => setTimeout(resolve, delayMs));

                // Lipat gandakan waktu tunggu untuk percobaan berikutnya (2s -> 4s -> 8s)
                delayMs *= 2;
                continue; // Ulangi loop fetch
            }

            // Jika error lain (misal 400 Bad Request, API key salah), langsung hentikan
            const errorBody = await response.text().catch(() => "Unknown error");
            throw new Error(`API Error HTTP ${response.status}: ${errorBody}`);

        } catch (error) {
            // Tangani error jaringan (misal koneksi putus tiba-tiba)
            if (attempt === maxRetries) {
                throw error;
            }
            console.warn(`[Gemini] Network/Fetch error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2;
        }
    }

    throw new Error("Gagal memanggil API Gemini secara tidak terduga.");
}

function getVideoDurationSeconds(segments: TranscriptSegment[]): number {
    if (segments.length === 0) return 0;
    return segments[segments.length - 1].end;
}

function calculateTargetQuizCount(durationSeconds: number): number {
    const minutes = durationSeconds / 60;

    if (minutes < 5) {
        return 3;
    }

    if (minutes < 10) {
        return Math.max(4, Math.ceil(durationSeconds / 90));
    }

    return Math.min(10, Math.max(4, Math.ceil(minutes / 2)));
}

// Transcript
function chunkTranscriptByCount(
    segments: TranscriptSegment[],
    targetCount: number
): TranscriptChunk[] {
    if (segments.length === 0) return [];

    const totalDuration = getVideoDurationSeconds(segments);
    const intervalSeconds = totalDuration / targetCount;

    const chunks: TranscriptChunk[] = [];
    let currentText = "";
    let chunkIndex = 0;
    let nextCheckpointSeconds = intervalSeconds;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment.text.trim()) continue;

        currentText += segment.text + " ";

        const isLastSegment = i === segments.length - 1;
        const hasReachedCheckpoint = segment.end >= nextCheckpointSeconds;
        const hasRemainingChunks = chunkIndex < targetCount - 1;

        if ((hasReachedCheckpoint && hasRemainingChunks) || isLastSegment) {
            const trimmedText = currentText.trim();
            if (trimmedText) {
                chunks.push({
                    trigger_time: Math.round(segment.end),
                    text: trimmedText,
                });
            }
            currentText = "";
            chunkIndex++;
            nextCheckpointSeconds = intervalSeconds * (chunkIndex + 1);
        }
    }

    return chunks;
}

function buildQuizGenerationPrompt(
    transcriptText: string,
    chunkIndex: number = 0,
    totalChunks: number = 1,
    durationMinutes: number = 3
): string {
    const positionPercent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    const isEarlyChunk = chunkIndex < Math.ceil(totalChunks * 0.33);
    const isLateChunk = chunkIndex >= Math.ceil(totalChunks * 0.66);

    const cognitiveLevel = isEarlyChunk
        ? "comprehension and recall (Bloom's Level 1–2: Remember / Understand) — test whether the learner grasped the core concept just introduced"
        : isLateChunk
            ? "analysis and application (Bloom's Level 3–4: Apply / Analyze) — test whether the learner can use or reason about the concept, not just recall it"
            : "conceptual understanding and application (Bloom's Level 2–3: Understand / Apply) — test whether the learner understands the mechanism behind the concept";

    const depthNote =
        durationMinutes >= 10
            ? "This is a substantial video. The learner has been engaged for an extended period — the question should reflect appropriate depth and avoid repeating surface-level facts covered earlier."
            : "This is a short, focused video. Keep the question tight and directly tied to the single core concept presented in this excerpt.";

    return `You are a Senior Instructional Designer and Expert Educator with 20+ years of experience designing high-stakes assessments for universities and professional certification programs.

Your task is to write exactly 1 (one) multiple-choice question for an adaptive pop-up quiz that pauses an educational video at the moment the learner has just finished watching the excerpt below.

## Positional Context
- Chunk: ${chunkIndex + 1} of ${totalChunks} (${positionPercent}% through the video)
- Target cognitive level: ${cognitiveLevel}
- ${depthNote}

## Question Quality Standards
1. **Test understanding, not verbatim recall.** Do NOT write questions like "What did the speaker say about X?" Write questions that confirm the learner *understood* the concept — e.g. "Why does X work this way?" or "What would happen if Y?"
2. **One unambiguously correct answer.** Based strictly on the transcript excerpt provided.
3. **Three high-quality distractors.** Each wrong option must represent a plausible misconception or a partially correct idea. A learner who only skimmed the content should NOT immediately spot the correct answer. Avoid obviously absurd options.
4. **No A/B/C/D or numbering inside option text.** The option strings themselves must be clean.
5. **Randomize correct answer position.** Do NOT always put the correct answer at the first index. Randomly place it in the second, third, or fourth position as well.
6. **Adaptive explanation.** The explanation must: (a) clearly state why the correct answer is right using evidence from the transcript, and (b) address the most tempting wrong answer and explain why it fails.
7. **Language matching.** Detect the language of the transcript and write the entire question, all options, and the explanation in that SAME language.

## Strict Output Format
Return ONLY a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "question": "A clear, conceptual question ending with a question mark?",
  "options": ["Plausible wrong answer", "Correct answer text", "Plausible wrong answer", "Plausible wrong answer"],
  "correct_answer": "Correct answer text",
  "explanation": "The correct answer is [X] because [evidence from transcript]. A common mistake is choosing [distractor] because [why it seems right], but [why it is actually wrong]."
}

CRITICAL: The value of "correct_answer" must be an exact character-for-character copy of one of the strings in the "options" array.

## Transcript Excerpt
"""
${transcriptText}
"""`;
}

function buildFullAssessmentPrompt(fullTranscript: string, currentBloomLevel: number = 1): string {
    // currentBloomLevel bisa dikirim dari database (1 = C1, dst.)
    // Untuk summative assessment (akhir), kita bisa minta AI menyebar dari C1 sampai C6

    return `You are an expert in Adaptive Learning Systems and Instructional Design.
I will provide you with a video transcript. Your task is to generate exactly 10 questions specifically designed for Semantic Similarity evaluation (7 must be "essay" and 3 must be "short_answer").

## Bloom's Taxonomy Integration
Distribute the 10 questions across the following levels based on the current target level (${currentBloomLevel}):
- If level is low (C1-C2): Focus on definitions and conceptual understanding.
- If level is high (C4-C6): Focus on analysis, case studies, and creation.
- Map each question to a specific 'bloom_level' (C1, C2, C3, C4, C5, or C6).

## Question Style Rules (No Multiple Choice)
1. **short_answer**: Requires a concise explanation (1-3 sentences).
2. **essay**: Requires deep reasoning and connection between concepts.
3. Every question MUST be evaluatable via Semantic Similarity. This means you must provide a "reference_answer" that is rich in keywords and core concepts.

## Formatting Rules
- "bloom_level": String (e.g., "C3 - Applying").
- "reference_answer": A comprehensive ideal answer used as a baseline for semantic comparison.
- "semantic_keywords": An array of 5-10 essential terms that must be present in the student's response.

## Strict Output Format (JSON Only)
[
  {
    "type": "short_answer",
    "bloom_level": "C2",
    "difficulty_level": 2,
    "question": "Text of the question?",
    "reference_answer": "The ideal complete answer for semantic matching...",
    "semantic_keywords": ["keyword1", "keyword2"],
    "explanation": "Logic behind the correct concept."
  }
]

## Full Video Transcript
"""
${fullTranscript}
"""`;
}

function buildSemanticAssessmentPrompt(fullTranscript: string, targetLevel: string, quantity: number): string {
    return `You are an expert Instructional Designer specializing in Adaptive Learning Systems and Psychometrics. Your task is to generate high-quality assessment questions based on a video transcript using Bloom's Taxonomy and Semantic Similarity principles.

### OBJECTIVES
- Generate exactly ${quantity} questions that specifically target the **${targetLevel}** level of Bloom's Taxonomy.
- For every question, provide a "reference_answer" that will serve as the ground truth for Semantic Similarity evaluation (Vector Embedding comparison).
- Include "semantic_keywords" that represent the core technical concepts that MUST be present in a correct response.

### BLOOM'S TAXONOMY GUIDELINES (Target: ${targetLevel})
- **C1 (Remember):** Focus on recalling facts, terms, and basic concepts.
- **C2 (Understand):** Focus on explaining ideas or concepts in own words.
- **C3 (Apply):** Focus on using information in new situations/scenarios.
- **C4 (Analyze):** Focus on drawing connections among ideas; breaking info into parts.
- **C5 (Evaluate):** Focus on justifying a stand or decision; critiquing.
- **C6 (Create):** Focus on producing new or original work based on the material.

### OUTPUT FORMAT (Strict JSON)
Return ONLY a JSON array of objects. Do not include markdown formatting or explanations outside the JSON.

[
  {
    "type": "short_answer",
    "bloom_level": "${targetLevel}",
    "difficulty_level": 3,
    "question": "The question text here...",
    "reference_answer": "A detailed, ideal answer (2-4 sentences) that covers all key points for semantic matching.",
    "semantic_keywords": ["keyword1", "keyword2", "keyword3"],
    "explanation": "Pedagogical explanation of why this is the correct concept."
  }
]

### INPUT DATA
**Video Transcript:**
"""
${fullTranscript}
"""`;
}

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
            const aiAnswer = await callGeminiApi(fullPrompt, false);

            return { content: [{ type: "text", text: aiAnswer }] };
        }
    );

    // Tool: generateAdaptiveVideoQuizzes 
    server.tool(
        "generateAdaptiveVideoQuizzes",
        "Generate adaptive multiple-choice quizzes from video transcripts. Quiz count and intervals are automatically calculated from video duration. Minimum 3 quizzes for videos under 5 minutes, minimum 4 for videos over 5 minutes, maximum 10 for videos 10 minutes or longer.",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
            userId: z.union([z.number(), z.string()]).describe("User ID for realtime progress notifications"),
            videoId: z.union([z.number(), z.string()]).describe("ID of the target video"),
            intervalMinutes: z
                .number()
                .optional()
                .describe(
                    "Optional: override the auto-calculated quiz interval (in minutes). When omitted, interval is determined dynamically from video duration."
                ),
        },
        async ({ token, userId, videoId, intervalMinutes }) => {
            const userIdStr = String(userId);

            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_started",
                video_id: videoId,
                message: "Memulai pembuatan kuis adaptif...",
                progress: 0,
            });

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
                    content: [
                        {
                            type: "text",
                            text: `Failed to fetch transcript: ${transcriptResponse.status} - ${errorText}`,
                        },
                    ],
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
                return {
                    content: [{ type: "text", text: "No transcript segments found." }],
                };
            }

            const durationSeconds = getVideoDurationSeconds(transcriptSegments);
            const durationMinutes = durationSeconds / 60;

            let targetQuizCount: number;

            if (intervalMinutes !== undefined && intervalMinutes > 0) {
                // Manual override: convert interval to count, then clamp to rules
                const rawCount = Math.ceil(durationSeconds / (intervalMinutes * 60));
                targetQuizCount = Math.min(10, Math.max(3, rawCount));
                console.log(
                    `[Quiz] Manual interval override: ${intervalMinutes}min → clamped to ${targetQuizCount} quizzes`
                );
            } else {
                targetQuizCount = calculateTargetQuizCount(durationSeconds);
            }

            console.log(
                `[Quiz] videoId=${videoId} | duration=${durationMinutes.toFixed(1)}min | targetQuizzes=${targetQuizCount}`
            );

            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_analyzing",
                video_id: videoId,
                message: `Video berdurasi ${durationMinutes.toFixed(1)} menit — akan membuat ${targetQuizCount} soal kuis...`,
                progress: 3,
                quiz_count: targetQuizCount,
                duration_minutes: Math.round(durationMinutes * 10) / 10,
            });

            const transcriptChunks = chunkTranscriptByCount(
                transcriptSegments,
                targetQuizCount
            );

            if (transcriptChunks.length === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: "Gagal membagi transkrip menjadi potongan.",
                });
                return {
                    content: [{ type: "text", text: "Failed to chunk transcript." }],
                };
            }

            const totalChunks = transcriptChunks.length;

            const generatedQuizzes: (ParsedQuiz & { trigger_time: number })[] = [];
            let failedChunkCount = 0;
            let lastErrorMessage = "Format kuis dari AI tidak valid.";

            for (let chunkIndex = 0; chunkIndex < transcriptChunks.length; chunkIndex++) {
                const chunk = transcriptChunks[chunkIndex];
                if (!chunk.text) continue;

                try {
                    const prompt = buildQuizGenerationPrompt(
                        chunk.text,
                        chunkIndex,
                        totalChunks,
                        durationMinutes
                    );

                    const rawLlmOutput = await callGeminiApi(prompt, true);
                    let parsedQuiz = parseQuizFromLlmOutput(rawLlmOutput);

                    if (!parsedQuiz) {
                        const repairPrompt = `You returned malformed output. Fix it into this exact JSON schema and return ONLY valid JSON — no markdown, no preamble:
                        {
                        "question": "string",
                        "options": ["string", "string", "string", "string"],
                        "correct_answer": "string (must exactly match one of the options)",
                        "explanation": "string"
                        }

                        Your previous output to fix:
                        ${rawLlmOutput}`;
                        const repairedOutput = await callGeminiApi(repairPrompt, true);
                        parsedQuiz = parseQuizFromLlmOutput(repairedOutput);
                    }

                    if (!parsedQuiz) {
                        throw new Error(
                            "Unable to extract a valid quiz format from LLM output after repair attempt."
                        );
                    }

                    generatedQuizzes.push({ ...parsedQuiz, trigger_time: chunk.trigger_time });

                } catch (error) {
                    failedChunkCount++;
                    lastErrorMessage =
                        error instanceof Error
                            ? error.message
                            : "Unknown error during quiz generation.";
                    console.error(
                        `[Quiz] Chunk ${chunkIndex + 1}/${totalChunks} failed: ${lastErrorMessage}`
                    );

                } finally {
                    const processedChunks = chunkIndex + 1;
                    const progressPercent = Math.min(
                        95,
                        Math.round((processedChunks / totalChunks) * 100)
                    );

                    emitNotificationToUser(userIdStr, {
                        event: "quiz_generation_progress",
                        video_id: videoId,
                        processed_chunks: processedChunks,
                        total_chunks: totalChunks,
                        progress: progressPercent,
                        message: `Membuat soal ${processedChunks} dari ${totalChunks}...`,
                    });
                }
            }

            if (generatedQuizzes.length === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: `Gagal membuat kuis: ${lastErrorMessage} (0/${totalChunks} chunk berhasil)`,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Quiz generation failed. Detail: ${lastErrorMessage}`,
                        },
                    ],
                };
            }

            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_saving",
                video_id: videoId,
                progress: 97,
                message: "Menyimpan kuis ke server...",
            });

            const saveResponse = await fetch(
                `${ENV.backendUrl}/videos/${videoId}/quizzes`,
                {
                    method: "POST",
                    headers: buildAuthHeaders(token),
                    body: JSON.stringify({ quizzes: generatedQuizzes }),
                }
            );

            if (!saveResponse.ok) {
                const saveErrorText = await saveResponse.text();
                emitNotificationToUser(userIdStr, {
                    event: "quiz_generation_failed",
                    video_id: videoId,
                    message: `Gagal menyimpan kuis: ${saveResponse.status}`,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to save quizzes: ${saveResponse.status} - ${saveErrorText}`,
                        },
                    ],
                };
            }

            const saveResult = await saveResponse.json();
            const savedQuizCount = saveResult.saved_count ?? generatedQuizzes.length;
            const skippedCount = totalChunks - generatedQuizzes.length;

            emitNotificationToUser(userIdStr, {
                event: "quiz_generation_completed",
                video_id: videoId,
                progress: 100,
                saved_count: savedQuizCount,
                message: `${savedQuizCount} kuis berhasil dibuat dan disimpan.`,
            });

            const triggerSummary = generatedQuizzes
                .map((q) => `${q.trigger_time}s`)
                .join(", ");

            return {
                content: [
                    {
                        type: "text",
                        text: [
                            `Done! Generated ${savedQuizCount} quizzes from a ${durationMinutes.toFixed(1)}-minute video.`,
                            skippedCount > 0
                                ? `(${skippedCount} chunk(s) skipped due to LLM errors)`
                                : "",
                            `Quiz trigger times: [${triggerSummary}]`,
                        ]
                            .filter(Boolean)
                            .join(" "),
                    },
                ],
            };
        }
    );

    // Tool: generateFullAssessment
    server.tool(
        "generateFullAssessment",
        "Generate a complete summative assessment with 10 mixed-type questions (5 MC, 3 short answer, 2 essay) from the full video transcript. Can run in parallel with adaptive quiz generation.",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
            userId: z.union([z.number(), z.string()]).describe("User ID for realtime progress notifications"),
            videoId: z.union([z.number(), z.string()]).describe("ID of the target video"),
            parallelWithQuiz: z
                .boolean()
                .optional()
                .describe(
                    "If true (default), attempt parallel generation with quiz. If false, wait for quiz to complete first."
                ),
        },
        async ({ token, userId, videoId, parallelWithQuiz = true }) => {
            const userIdStr = String(userId);

            emitNotificationToUser(userIdStr, {
                event: "assessment_generation_started",
                video_id: videoId,
                message: "Memulai pembuatan penilaian ringkasan...",
                assessment_progress: 0,
                assessment_status: "starting",
            });

            const transcriptResponse = await fetch(
                `${ENV.backendUrl}/videos/${videoId}/transcript`,
                { method: "GET", headers: buildAuthHeaders(token) }
            );

            if (!transcriptResponse.ok) {
                const errorText = await transcriptResponse.text();
                emitNotificationToUser(userIdStr, {
                    event: "assessment_generation_failed",
                    video_id: videoId,
                    message: `Gagal mengambil transkrip: ${transcriptResponse.status}`,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to fetch transcript: ${transcriptResponse.status} - ${errorText}`,
                        },
                    ],
                };
            }

            const transcriptBody = await transcriptResponse.json();
            const transcriptSegments: TranscriptSegment[] = transcriptBody.data ?? [];

            if (transcriptSegments.length === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "assessment_generation_failed",
                    video_id: videoId,
                    message: "Transkrip video kosong, penilaian tidak bisa dibuat.",
                });
                return {
                    content: [{ type: "text", text: "No transcript segments found." }],
                };
            }

            // Construct full transcript from segments
            const fullTranscript = transcriptSegments
                .map((seg) => seg.text)
                .join(" ")
                .trim();

            if (!fullTranscript) {
                emitNotificationToUser(userIdStr, {
                    event: "assessment_generation_failed",
                    video_id: videoId,
                    message: "Transkrip kosong, penilaian tidak bisa dibuat.",
                });
                return {
                    content: [{ type: "text", text: "Transcript is empty." }],
                };
            }

            const durationSeconds = getVideoDurationSeconds(transcriptSegments);
            const durationMinutes = durationSeconds / 60;

            emitNotificationToUser(userIdStr, {
                event: "assessment_generation_analyzing",
                video_id: videoId,
                message: `Video berdurasi ${durationMinutes.toFixed(1)} menit — membuat 10 soal penilaian...`,
                assessment_progress: 5,
                assessment_status: "analyzing",
            });

            let generatedQuestions: SemanticAssessmentQuestion[] = [];
            let failedAttempts = 0;
            const maxAttempts = 3;
            let lastErrorMessage = "Format penilaian dari AI tidak valid.";

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const prompt = buildFullAssessmentPrompt(fullTranscript);
                    const rawLlmOutput = await callGeminiApi(prompt, true);
                    let parsedQuestions = parseSemanticAssessmentFromLlmOutput(rawLlmOutput);

                    if (!parsedQuestions || parsedQuestions.length === 0) {
                        const repairPrompt = `You returned malformed output. Fix it into this exact JSON schema and return ONLY a valid JSON array with exactly 10 objects — no markdown, no preamble:
                        [
                          {
                            "type": "short_answer",
                            "bloom_level": "C2",
                            "difficulty_level": 2,
                            "question": "string",
                            "reference_answer": "string",
                            "semantic_keywords": ["string"],
                            "explanation": "string"
                          }
                        ]

                        Your previous output to fix:
                        ${rawLlmOutput}`;
                        const repairedOutput = await callGeminiApi(repairPrompt, true);
                        parsedQuestions = parseSemanticAssessmentFromLlmOutput(repairedOutput);
                    }

                    if (parsedQuestions && parsedQuestions.length === 10) {
                        // Accept only if we get exactly 10
                        generatedQuestions = parsedQuestions.slice(0, 10);
                        break;
                    } else {
                        throw new Error(
                            `Generated only ${parsedQuestions?.length ?? 0} valid questions, need exactly 10.`
                        );
                    }
                } catch (error) {
                    failedAttempts++;
                    lastErrorMessage =
                        error instanceof Error
                            ? error.message
                            : "Unknown error during assessment generation.";
                    console.error(
                        `[Assessment] Attempt ${attempt + 1}/${maxAttempts} failed: ${lastErrorMessage}`
                    );

                    emitNotificationToUser(userIdStr, {
                        event: "assessment_generation_progress",
                        video_id: videoId,
                        assessment_progress: 20 + attempt * 25,
                        message: `Upaya ${attempt + 1} gagal, mencoba lagi...`,
                    });

                    if (attempt < maxAttempts - 1) {
                        // Add delay before retry
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                }
            }

            if (generatedQuestions.length < 10) {
                emitNotificationToUser(userIdStr, {
                    event: "assessment_generation_failed",
                    video_id: videoId,
                    message: `Gagal membuat penilaian: ${lastErrorMessage} (${failedAttempts}/${maxAttempts} upaya gagal)`,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Assessment generation failed. Detail: ${lastErrorMessage}`,
                        },
                    ],
                };
            }

            emitNotificationToUser(userIdStr, {
                event: "assessment_generation_saving",
                video_id: videoId,
                assessment_progress: 95,
                message: "Menyimpan penilaian ke server...",
            });

            let savedAssessmentCount = 0;
            const assessmentEndpoint = `${ENV.backendUrl}/questions`;

            const toAssessmentPayload = (question: SemanticAssessmentQuestion) => ({
                video_id: String(videoId),
                type: question.type,
                question: question.question,
                options: question.semantic_keywords,
                accepted_answers: [question.reference_answer],
                explanation: question.explanation,
                bloom_level: question.bloom_level,
            });

            // Save questions individually (backend apiResource store handles one at a time)
            for (let qIndex = 0; qIndex < generatedQuestions.length; qIndex++) {
                const question = generatedQuestions[qIndex];
                try {
                    const saveResponse = await fetch(assessmentEndpoint, {
                        method: "POST",
                        headers: buildAuthHeaders(token),
                        body: JSON.stringify(toAssessmentPayload(question)),
                    });

                    if (saveResponse.ok) {
                        savedAssessmentCount++;
                        console.log(`[Assessment] Saved question ${qIndex + 1}/${generatedQuestions.length}`);
                    } else {
                        const errorText = await saveResponse
                            .text()
                            .catch(() => "Unknown backend error");
                        console.warn(
                            `[Assessment] Failed to save question ${qIndex + 1}: HTTP ${saveResponse.status} | Response: ${errorText}`
                        );
                    }
                } catch (error) {
                    console.error(`[Assessment] Error saving question ${qIndex + 1}:`, error);
                }
            }

            if (savedAssessmentCount === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "assessment_generation_failed",
                    video_id: videoId,
                    message: `Gagal menyimpan penilaian: Tidak ada soal yang berhasil disimpan.`,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to save assessment: No questions were saved successfully.`,
                        },
                    ],
                };
            }

            emitNotificationToUser(userIdStr, {
                event: "assessment_generation_completed",
                video_id: videoId,
                assessment_progress: 100,
                assessment_saved_count: savedAssessmentCount,
                message: `${savedAssessmentCount} soal penilaian berhasil dibuat dan disimpan.`,
            });

            const questionSummary = generatedQuestions
                .slice(0, savedAssessmentCount)
                .map((q) => `${q.type}(L${q.difficulty_level})`)
                .join(", ");

            return {
                content: [
                    {
                        type: "text",
                        text: [
                            `Done! Generated and saved ${savedAssessmentCount} assessment questions.`,
                            `Question types: ${questionSummary}`,
                        ]
                            .filter(Boolean)
                            .join(" | "),
                    },
                ],
            };
        }
    );

    // Tool: generateSemanticAssessment
    server.tool(
        "generateSemanticAssessment",
        "Generate a set of semantic similarity questions targeting a specific Bloom's Taxonomy level.",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
            userId: z.union([z.number(), z.string()]).describe("User ID for realtime progress notifications"),
            videoId: z.union([z.number(), z.string()]).describe("ID of the target video"),
            targetLevel: z.enum(["C1", "C2", "C3", "C4", "C5", "C6"]).describe("Target Bloom's Taxonomy Level"),
            quantity: z.number().describe("Number of questions to generate"),
        },
        async ({ token, userId, videoId, targetLevel, quantity }) => {
            const userIdStr = String(userId);

            emitNotificationToUser(userIdStr, {
                event: "semantic_generation_started",
                video_id: videoId,
                message: `Memulai pembuatan pertanyaan semantik level ${targetLevel}...`,
                assessment_progress: 0,
                assessment_status: "starting",
            });

            const transcriptResponse = await fetch(
                `${ENV.backendUrl}/videos/${videoId}/transcript`,
                { method: "GET", headers: buildAuthHeaders(token) }
            );

            if (!transcriptResponse.ok) {
                const errorText = await transcriptResponse.text();
                return {
                    content: [
                        { type: "text", text: `Failed to fetch transcript: ${transcriptResponse.status} - ${errorText}` },
                    ],
                };
            }

            const transcriptBody = await transcriptResponse.json();
            const transcriptSegments: TranscriptSegment[] = transcriptBody.data ?? [];

            if (transcriptSegments.length === 0) {
                return { content: [{ type: "text", text: "No transcript segments found." }] };
            }

            const fullTranscript = transcriptSegments.map((seg) => seg.text).join(" ").trim();

            if (!fullTranscript) {
                return { content: [{ type: "text", text: "Transcript is empty." }] };
            }

            emitNotificationToUser(userIdStr, {
                event: "semantic_generation_analyzing",
                video_id: videoId,
                message: `Membuat ${quantity} soal semantik...`,
                assessment_progress: 5,
                assessment_status: "analyzing",
            });

            let generatedQuestions: SemanticAssessmentQuestion[] = [];
            let failedAttempts = 0;
            const maxAttempts = 2;
            let lastErrorMessage = "Format dari AI tidak valid.";

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const prompt = buildSemanticAssessmentPrompt(fullTranscript, targetLevel, quantity);
                    const rawLlmOutput = await callGeminiApi(prompt, true);
                    let parsedQuestions = parseSemanticAssessmentFromLlmOutput(rawLlmOutput);

                    if (!parsedQuestions || parsedQuestions.length === 0) {
                        const repairPrompt = `You returned malformed output. Fix it into this exact JSON schema and return ONLY a valid JSON array with exactly ${quantity} objects — no markdown, no preamble:
                        [
                          {
                            "type": "short_answer",
                            "bloom_level": "${targetLevel}",
                            "difficulty_level": 3,
                            "question": "string",
                            "reference_answer": "string",
                            "semantic_keywords": ["string"],
                            "explanation": "string"
                          }
                        ]

                        Your previous output to fix:
                        ${rawLlmOutput}`;
                        const repairedOutput = await callGeminiApi(repairPrompt, true);
                        parsedQuestions = parseSemanticAssessmentFromLlmOutput(repairedOutput);
                    }

                    if (parsedQuestions && parsedQuestions.length >= Math.max(1, quantity - 2)) {
                        generatedQuestions = parsedQuestions.slice(0, quantity);
                        break;
                    } else {
                        throw new Error(
                            `Generated only ${parsedQuestions?.length ?? 0} valid questions, expected at least ${Math.max(1, quantity - 2)}.`
                        );
                    }
                } catch (error) {
                    failedAttempts++;
                    lastErrorMessage = error instanceof Error ? error.message : "Unknown error";
                    if (attempt < maxAttempts - 1) {
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                }
            }

            if (generatedQuestions.length === 0) {
                emitNotificationToUser(userIdStr, {
                    event: "semantic_generation_failed",
                    video_id: videoId,
                    message: `Gagal membuat pertanyaan: ${lastErrorMessage}`,
                });
                return {
                    content: [{ type: "text", text: `Generation failed. Detail: ${lastErrorMessage}` }],
                };
            }

            emitNotificationToUser(userIdStr, {
                event: "semantic_generation_saving",
                video_id: videoId,
                assessment_progress: 95,
                message: "Menyimpan pertanyaan semantik ke server...",
            });

            let savedAssessmentCount = 0;
            const assessmentEndpoint = `${ENV.backendUrl}/questions`;

            const toAssessmentPayload = (question: SemanticAssessmentQuestion) => ({
                video_id: String(videoId),
                type: question.type,
                question: question.question,
                options: question.semantic_keywords,
                accepted_answers: [question.reference_answer],
                explanation: question.explanation,
                bloom_level: question.bloom_level,
            });

            for (let qIndex = 0; qIndex < generatedQuestions.length; qIndex++) {
                const question = generatedQuestions[qIndex];
                try {
                    const saveResponse = await fetch(assessmentEndpoint, {
                        method: "POST",
                        headers: buildAuthHeaders(token),
                        body: JSON.stringify(toAssessmentPayload(question)),
                    });

                    if (saveResponse.ok) {
                        savedAssessmentCount++;
                    }
                } catch (error) {
                    console.error(`[Semantic Assessment] Error saving question ${qIndex + 1}:`, error);
                }
            }

            emitNotificationToUser(userIdStr, {
                event: "semantic_generation_completed",
                video_id: videoId,
                assessment_progress: 100,
                assessment_saved_count: savedAssessmentCount,
                message: `${savedAssessmentCount} pertanyaan semantik berhasil dibuat dan disimpan.`,
            });

            return {
                content: [
                    {
                        type: "text",
                        text: `Done! Generated and saved ${savedAssessmentCount} semantic similarity questions.`,
                    },
                ],
            };
        }
    );

    return server;
}

// Express app setup
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

function resolveAllowedOriginHeader(requestOrigin: string | undefined): string {
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin;
    return ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
}

// Routes
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

    res.write(":\n\n");

    notificationClientsByUserId.set(userId, res);
    console.log(`[Notifications] Client connected: userId=${userId}`);

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

app.post("/webhook/transcription-done", express.json(), (req: Request, res: Response) => {
    const { video_id, user_id, status } = req.body ?? {};

    if (!video_id || !user_id || !status) {
        res.status(400).json({ error: "Missing required fields: video_id, user_id, status" });
        return;
    }

    if (status === "completed") {
        // Emit status change so the frontend can update the video card in-place
        emitNotificationToUser(String(user_id), {
            event: "video_status_changed",
            video_id,
            status: "completed",
        });

        emitNotificationToUser(String(user_id), {
            event: "transcription_ready",
            video_id,
        });
        console.log(
            `[Webhook] transcription_ready sent: videoId=${video_id}, userId=${user_id}`
        );
    }

    res.status(200).json({ received: true });
});

// Generic webhook for any video status change (pending → processing → completed / failed)
app.post("/webhook/video-status", express.json(), (req: Request, res: Response) => {
    const { video_id, user_id, status } = req.body ?? {};

    if (!video_id || !user_id || !status) {
        res.status(400).json({ error: "Missing required fields: video_id, user_id, status" });
        return;
    }

    emitNotificationToUser(String(user_id), {
        event: "video_status_changed",
        video_id,
        status,
    });
    console.log(
        `[Webhook] video_status_changed sent: videoId=${video_id}, userId=${user_id}, status=${status}`
    );

    res.status(200).json({ received: true });
});

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
        console.error(
            `[SSE] Error handling message for session ${sessionId}:`,
            error
        );
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error while handling message." });
        }
    }
});

app.listen(ENV.port, "0.0.0.0", () => {
    console.log(`[Server] MCP SSE Server running on http://0.0.0.0:${ENV.port}`);
    console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});