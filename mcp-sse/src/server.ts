import { Groq } from 'groq-sdk';
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
import { TranscriptContext, getOrLoadTranscriptContext } from "./utils/cacheManager.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const activeSSESessions = new Map<string, SSEServerTransport>();
const notificationClientsByUserId = new Map<string, Set<Response>>();
const PENDING_NOTIFICATION_TTL_MS = 5 * 60 * 1000;

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
    const clients = notificationClientsByUserId.get(userId);

    if (!clients || clients.size === 0) {
        bufferNotificationForUser(userId, payload);
        console.log(`[Notifications] userId=${userId} offline — buffered event "${payload.event}"`);
        return;
    }

    const deadClients = new Set<Response>();
    clients.forEach(client => {
        if (client.writableEnded || client.closed) {
            deadClients.add(client);
            return;
        }
        client.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    deadClients.forEach(client => clients.delete(client));
    if (clients.size === 0) {
        notificationClientsByUserId.delete(userId);
    }
}

async function callGroqApi(
    prompt: string,
    expectJson: boolean = true,
    transcriptContext?: TranscriptContext
): Promise<string> {
    const groq = new Groq({ apiKey: ENV.groqApiKey });

    let finalPrompt = prompt;
    if (transcriptContext && transcriptContext.rawText) {
        finalPrompt += `\n\n## Full Video Transcript\n"""\n${transcriptContext.rawText}\n"""`;
    }

    const maxRetries = 3;
    let delayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: finalPrompt
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.2,
                max_completion_tokens: 6000,
                top_p: 1,
                stream: false,
                stop: null
            });

            return chatCompletion.choices[0]?.message?.content || (expectJson ? "[]" : "");

        } catch (error: any) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.warn(`[Groq] Error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000}s...`);
            await sleep(delayMs);
            delayMs *= 2;
        }
    }

    throw new Error("Failed to call Groq API. Unexpected error.");
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
    durationMinutes: number = 3,
    includeAnswers: boolean = true
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
  "correct_answer": "${includeAnswers ? "Correct answer text" : ""}",
  "explanation": "${includeAnswers ? "The correct answer is [X] because [evidence from transcript]. A common mistake is choosing [distractor] because [why it seems right], but [why it is actually wrong]." : ""}"
}

CRITICAL: ${includeAnswers ? "The value of \"correct_answer\" must be an exact character-for-character copy of one of the strings in the \"options\" array." : "You MUST leave \"correct_answer\" and \"explanation\" as empty strings because the teacher requested to add answers manually."}

## Task
The full video transcript is provided to you. I want you to write ONE multiple-choice question specifically focusing on the concepts discussed in THIS specific excerpt from the video:

"""
${transcriptText}
"""

Ensure the question makes sense in the broader context of the whole video.`;
}

function buildFullAssessmentPrompt(targetBloomLevels: string = "C1, C2, and C3", includeAnswers: boolean = true): string {
    return `You are an expert in Adaptive Learning Systems and Instructional Design.
I will provide you with a video transcript. Your task is to generate exactly 10 questions specifically designed for Semantic Similarity evaluation (7 must be "essay" and 3 must be "short_answer").

## Bloom's Taxonomy Integration
Distribute the 10 questions across the following levels: ${targetBloomLevels}
- If targeting C1-C3: Focus on definitions, conceptual understanding, and application.
- If targeting C4-C5: Focus on analysis, evaluation, and drawing connections among ideas.
- Map each question to a specific 'bloom_level' (must be one of the targeted levels, e.g. "C1", "C2", etc.).

## Question Style Rules (No Multiple Choice)
1. **short_answer**: Requires a concise explanation (1-3 sentences).
2. **essay**: Requires deep reasoning and connection between concepts.
3. Every question MUST be evaluatable via Semantic Similarity. This means you must provide a "reference_answer" that is rich in keywords and core concepts.

## Formatting Rules
- "bloom_level": String (e.g., "C3 - Applying").
- "reference_answer": ${includeAnswers ? "A comprehensive ideal answer used as a baseline for semantic comparison." : "MUST BE AN EMPTY STRING."}
- "semantic_keywords": ${includeAnswers ? "An array of 5-10 essential terms that must be present in the student's response." : "MUST BE AN EMPTY ARRAY []."}

## Strict Output Format (JSON Only)
Return ONLY a valid JSON array. Do not include markdown formatting or explanations outside the JSON.
[
  {
    "type": "short_answer",
    "bloom_level": "C2",
    "difficulty_level": 2,
    "question": "Text of the question?",
    "reference_answer": "${includeAnswers ? "The ideal complete answer for semantic matching..." : ""}",
    "semantic_keywords": ${includeAnswers ? "[\"keyword1\", \"keyword2\"]" : "[]"},
    "explanation": "${includeAnswers ? "Logic behind the correct concept." : ""}"
  }
]`;
}

function buildSemanticAssessmentPrompt(targetLevel: string, quantity: number): string {
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
Return ONLY a valid JSON array. Do not include markdown formatting or explanations outside the JSON.
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
]`;
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

    server.tool(
        "analyzeVideoAudioPaths",
        "Fetch user's video data and use LLM to answer questions about their audio paths",
        {
            token: z.string().describe("Bearer token of the currently logged-in user"),
            prompt: z.string().describe("Question or instruction for LLM about the audio path data"),
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
            const aiAnswer = await callGroqApi(fullPrompt, false);

            return { content: [{ type: "text", text: aiAnswer }] };
        }
    );

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
            includeAnswers: z.boolean().optional().default(true).describe("If true, AI generates the answers and feedback. If false, leaves them blank."),
        },
        async ({ token, userId, videoId, intervalMinutes, includeAnswers }) => {
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
                        durationMinutes,
                        includeAnswers
                    );

                    // 👉 transcriptContext DIHAPUS agar tidak mengirim full transcript untuk setiap soal (Hemat TPM)
                    const rawLlmOutput = await callGroqApi(prompt, true);
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
                        const repairedOutput = await callGroqApi(repairPrompt, true);
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

                    if (chunkIndex < transcriptChunks.length - 1) {
                        console.log(`[Quiz] Menunggu 2 detik sebelum menembak soal berikutnya...`);
                        await sleep(2000);
                    }
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
            includeAnswers: z.boolean().optional().default(true).describe("If true, AI generates the answers and feedback. If false, leaves them blank."),
        },
        async ({ token, userId, videoId, parallelWithQuiz = true, includeAnswers = true }) => {
            const userIdStr = String(userId);

            emitNotificationToUser(userIdStr, {
                event: "assessment_generation_started",
                video_id: videoId,
                message: "Starting to create assessment...",
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
                    message: "No transcript segments found, cannot create assessment.",
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
                    message: "Transcript is empty, cannot create assessment.",
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
                message: `Video duration: ${durationMinutes.toFixed(1)} minutes — creating 10 assessment questions...`,
                assessment_progress: 5,
                assessment_status: "analyzing",
            });

            let targetBloomLevels = "C1, C2, and C3"; // Default assessment
            try {
                const qaResponse = await fetch(`${ENV.backendUrl}/question-answers?per_page=100`, {
                    method: "GET",
                    headers: buildAuthHeaders(token),
                });
                if (qaResponse.ok) {
                    const qaBody = await qaResponse.json();
                    const answers = qaBody.data || [];
                    if (answers.length > 0) {
                        const newestVideoId = answers[0].question?.video_id;
                        if (newestVideoId) {
                            const videoAnswers = answers.filter((a: any) => a.question?.video_id === newestVideoId);
                            const correctCount = videoAnswers.filter((a: any) => a.is_correct === true).length;

                            if (correctCount > 6) {
                                targetBloomLevels = "C4 and C5";
                                console.log(`[Assessment] User scored ${correctCount}/${videoAnswers.length} on video ${newestVideoId}. Upgrading to C4-C5.`);
                            } else {
                                console.log(`[Assessment] User scored ${correctCount}/${videoAnswers.length} on video ${newestVideoId}. Maintaining C1-C3.`);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("[Assessment] Error fetching previous question answers:", err);
            }

            let generatedQuestions: SemanticAssessmentQuestion[] = [];
            let failedAttempts = 0;
            const maxAttempts = 3;
            let lastErrorMessage = "Assessment format from AI is invalid.";

            const transcriptContext = await getOrLoadTranscriptContext(String(videoId), token, transcriptSegments);

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const prompt = buildFullAssessmentPrompt(targetBloomLevels, includeAnswers);
                    const rawLlmOutput = await callGroqApi(prompt, true, transcriptContext);
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
                        const repairedOutput = await callGroqApi(repairPrompt, true);
                        parsedQuestions = parseSemanticAssessmentFromLlmOutput(repairedOutput);
                    }

                    if (parsedQuestions && parsedQuestions.length === 10) {
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
                        await sleep(1000);
                    }
                }
            }

            if (generatedQuestions.length < 10) {
                emitNotificationToUser(userIdStr, {
                    event: "assessment_generation_failed",
                    video_id: videoId,
                    message: `Failed to create assessment: ${lastErrorMessage} (${failedAttempts}/${maxAttempts} attempts failed)`,
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
                message: "Saving assessment to server...",
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
                    message: `Failed to save assessment: No questions were saved successfully.`,
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
                message: `${savedAssessmentCount} assessment questions successfully created and saved.`,
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

            const transcriptContext = await getOrLoadTranscriptContext(String(videoId), token, transcriptSegments);

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    const prompt = buildSemanticAssessmentPrompt(targetLevel, quantity);
                    const rawLlmOutput = await callGroqApi(prompt, true, transcriptContext);
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
                        const repairedOutput = await callGroqApi(repairPrompt, true);
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
                        await sleep(1000);
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

    server.tool(
        "evaluateAssessmentAnswers",
        "Evaluates the user's answers for a given video assessment and saves the scores to the database.",
        {
            videoId: z.string().describe("ID of the video"),
            userId: z.string().describe("User ID"),
            token: z.string().describe("Bearer token for API access"),
        },
        async ({ videoId, userId, token }) => {
            try {
                emitNotificationToUser(userId, {
                    event: "assessment_evaluation_started",
                    video_id: videoId,
                    message: "Memulai evaluasi jawaban...",
                });

                const transcriptResponse = await fetch(`${ENV.backendUrl}/videos/${videoId}/transcript`, {
                    method: "GET",
                    headers: buildAuthHeaders(token),
                });
                let transcriptSegments: TranscriptSegment[] = [];
                if (transcriptResponse.ok) {
                    const transcriptData = await transcriptResponse.json();
                    transcriptSegments = transcriptData.data || [];
                }
                const transcriptContext = await getOrLoadTranscriptContext(String(videoId), token, transcriptSegments);

                const qResponse = await fetch(`${ENV.backendUrl}/questions?video_id=${videoId}`, {
                    method: "GET",
                    headers: buildAuthHeaders(token),
                });
                if (!qResponse.ok) throw new Error("Failed to fetch questions");
                const qData = await qResponse.json();
                const questions = qData.data || [];

                const ansResponse = await fetch(`${ENV.backendUrl}/question-answers?video_id=${videoId}&per_page=100`, {
                    method: "GET",
                    headers: buildAuthHeaders(token),
                });
                if (!ansResponse.ok) throw new Error("Failed to fetch answers");
                const ansData = await ansResponse.json();
                const allAnswers = ansData.data || [];

                const evaluationItems: Array<{
                    question_id: string;
                    question: string;
                    reference: string;
                    student_answer: string;
                }> = [];
                for (const ans of allAnswers) {
                    const question = questions.find((q: any) => q.uuid === ans.question.uuid || q.uuid === ans.question_id);
                    if (!question) continue;

                    let referenceAnswer = "";
                    if (Array.isArray(question.accepted_answers)) {
                        referenceAnswer = question.accepted_answers.join(" ");
                    } else if (typeof question.accepted_answers === "string") {
                        referenceAnswer = question.accepted_answers;
                    }

                    evaluationItems.push({
                        question_id: question.uuid,
                        question: question.question,
                        reference: referenceAnswer,
                        student_answer: ans.user_answer
                    });
                }

                if (evaluationItems.length === 0) {
                    return { content: [{ type: "text", text: "No valid questions matched to evaluate" }] };
                }

                const prompt = `You are a warm, supportive study advisor — not a cold grading machine. You speak Indonesian using "kamu" (never "Anda"). Your tone is like a trusted senior friend who genuinely cares about the student's growth.

I have provided the Full Video Transcript. 
Evaluate the student's answer not just against the reference, but check if their answer demonstrates understanding of the concepts as taught in the video transcript.

## Your Task
Evaluate each student answer against the reference answer using semantic similarity. Then write a short, personal feedback (1-3 sentences max) in Indonesian.

## Feedback Style Guide
- **Correct answers:** Acknowledge specifically what the student understood well. Example: "Bagus, kamu sudah memahami konsep X dengan tepat." Don't just say "benar" — point out the insight they demonstrated.
- **Partially correct:** Recognize what they got right first, then gently point out what's missing. Example: "Kamu sudah di jalur yang benar soal X, tapi coba perdalam lagi bagian Y."
- **Wrong answers:** Never say "salah" bluntly. Instead: (1) acknowledge their effort, (2) explain the key concept briefly, (3) give one concrete learning tip. Example: "Sepertinya konsep X masih perlu diperkuat. Coba review ulang bagian tentang Y — buat catatan kecil poin-poin pentingnya supaya lebih mudah diingat."
- **Irrelevant answers:** Be honest but kind. Example: "Jawaban kamu belum nyambung dengan pertanyaannya. Coba baca ulang materinya pelan-pelan, fokus ke bagian tentang X."

## Rules
- Always write in Indonesian, casual but respectful
- Never be patronizing or overly dramatic
- Keep it practical — if suggesting a study method, make it specific (e.g. "coba buat mind map", "highlight kata kunci", "ulangi bagian video menit ke-X")
- Match the depth of feedback to the question type (short_answer = brief feedback, essay = slightly more detailed)

## Input Data
${JSON.stringify(evaluationItems, null, 2)}

## Output Format (STRICT JSON, no markdown)
[
  {
    "question_id": "uuid string",
    "score": number (0-100),
    "decision": "correct" | "partial" | "wrong",
    "feedback": "Personal feedback in Indonesian as described above."
  }
]`;

                const rawOutput = await callGroqApi(prompt, true, transcriptContext);
                let parsedResults = [];
                try {
                    const cleanedOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
                    parsedResults = JSON.parse(cleanedOutput);
                } catch (e) {
                    console.error("[Evaluate Tool] Failed to parse AI response:", rawOutput);
                    throw new Error("Failed to parse evaluation response");
                }

                const savePromises = parsedResults.map(async (result: any) => {
                    const studentAns = evaluationItems.find((a: any) => a.question_id === result.question_id);
                    if (!studentAns) return;

                    const updatePayload = {
                        score: result.score,
                        is_correct: result.decision === "correct",
                        feedback: result.feedback
                    };

                    console.log(`[Evaluate Tool] Updating score for ${result.question_id}:`, updatePayload);

                    const saveResponse = await fetch(`${ENV.backendUrl}/question-answers/${result.question_id}/score`, {
                        method: "PUT",
                        headers: buildAuthHeaders(token),
                        body: JSON.stringify(updatePayload),
                    });

                    if (!saveResponse.ok) {
                        const errText = await saveResponse.text();
                        console.error(`[Evaluate Tool] Failed to update ${result.question_id}:`, saveResponse.status, errText);
                    } else {
                        console.log(`[Evaluate Tool] Successfully updated ${result.question_id}`);
                    }
                });

                await Promise.allSettled(savePromises);

                emitNotificationToUser(userId, {
                    event: "assessment_evaluation_completed",
                    video_id: videoId,
                    message: "Evaluasi jawaban selesai.",
                });

                return { content: [{ type: "text", text: `Evaluated ${parsedResults.length} answers successfully.` }] };
            } catch (error) {
                console.error("[Evaluate Tool Error]", error);
                emitNotificationToUser(userId, {
                    event: "assessment_evaluation_failed",
                    video_id: videoId,
                    message: "Evaluasi jawaban gagal.",
                });
                return { content: [{ type: "text", text: `Failed to evaluate answers: ${error instanceof Error ? error.message : "Unknown error"}` }] };
            }
        }
    );

    return server;
}

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

app.get("/notifications", (req: Request, res: Response) => {
    const userId = req.query.userId as string;

    if (!userId) {
        res.status(400).json({ error: "Missing required query parameter: userId" });
        return;
    }

    req.socket.setTimeout(0);
    req.socket.setKeepAlive(true);

    const allowedOrigin = resolveAllowedOriginHeader(req.headers.origin);

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
        "X-Accel-Buffering": "no"
    });

    res.write(":\n\n");

    if (!notificationClientsByUserId.has(userId)) {
        notificationClientsByUserId.set(userId, new Set());
    }
    notificationClientsByUserId.get(userId)!.add(res);
    console.log(`[Notifications] Client connected: userId = ${userId} (Total clients: ${notificationClientsByUserId.get(userId)!.size})`);

    flushPendingNotifications(userId, res);

    const heartbeatInterval = setInterval(() => {
        if (!res.writableEnded && !res.closed) {
            res.write("event: ping\ndata: {}\n\n");
        }
    }, 15_000);

    req.on("close", () => {
        clearInterval(heartbeatInterval);
        const clients = notificationClientsByUserId.get(userId);
        if (clients) {
            clients.delete(res);
            if (clients.size === 0) {
                notificationClientsByUserId.delete(userId);
            }
        }
        console.log(`[Notifications] Client disconnected: userId = ${userId} (Remaining: ${clients?.size || 0})`);
    });
});

app.post("/webhook/transcription-done", express.json(), async (req: Request, res: Response) => {
    const { video_id, user_id, status, token, skip_ai } = req.body ?? {};

    if (!video_id || !user_id || !status) {
        res.status(400).json({ error: "Missing required fields: video_id, user_id, status" });
        return;
    }

    if (status === "completed") {
        emitNotificationToUser(String(user_id), {
            event: "video_status_changed",
            video_id,
            status: "completed",
        });

        emitNotificationToUser(String(user_id), {
            event: "transcription_ready",
            video_id,
            skip_ai: skip_ai === true,
        });

        console.log(`[Webhook] transcription_ready sent for videoId = ${video_id}`);

        if (token) {
            getOrLoadTranscriptContext(String(video_id), String(token))
                .then(() => {
                    console.log(`[Webhook-Preloader] Success warming cache for video ${video_id}`);
                })
                .catch((err) => {
                    console.error(`[Webhook-Preloader] Failed warming cache background worker:`, err.message);
                });
        } else {
            console.warn(`[Webhook-Preloader] No token provided in payload. Skipping warm-up optimization.`);
        }
    }

    res.status(200).json({ received: true, preloading: status === "completed" && !!token });
});

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
        `[Webhook] video_status_changed sent: videoId = ${video_id}, userId = ${user_id}, status = ${status}`
    );

    res.status(200).json({ received: true });
});



app.get("/sse", async (req: Request, res: Response) => {
    req.socket.setTimeout(0);
    req.socket.setKeepAlive(true);

    const allowedOrigin = resolveAllowedOriginHeader(req.headers.origin);
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const transport = new SSEServerTransport("/messages", res);
    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);

    activeSSESessions.set(transport.sessionId, transport);
    console.log(`[SSE] Session opened: ${transport.sessionId}`);

    const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
            res.write(":\n\n");
        }
    }, 15_000);

    req.on("close", () => {
        clearInterval(keepAliveInterval);
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
            `[SSE] Error handling message for session ${sessionId}: `,
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