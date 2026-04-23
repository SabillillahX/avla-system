import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { ENV, ALLOWED_ORIGINS } from "./utils/helper.js";
import { parseQuizFromLlmOutput, parseAssessmentFromLlmOutput } from "./utils/helper.js";
// In memory stores
const activeSSESessions = new Map();
const notificationClientsByUserId = new Map();
const PENDING_NOTIFICATION_TTL_MS = 5 * 60 * 1000; // 5 minutes
const pendingNotificationsByUserId = new Map();
function bufferNotificationForUser(userId, payload) {
    const existing = pendingNotificationsByUserId.get(userId) ?? [];
    existing.push({ payload, expiresAt: Date.now() + PENDING_NOTIFICATION_TTL_MS });
    pendingNotificationsByUserId.set(userId, existing);
}
function flushPendingNotifications(userId, client) {
    const pending = pendingNotificationsByUserId.get(userId);
    if (!pending?.length)
        return;
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
function emitNotificationToUser(userId, payload) {
    const client = notificationClientsByUserId.get(userId);
    if (!client) {
        bufferNotificationForUser(userId, payload);
        console.log(`[Notifications] userId=${userId} offline — buffered event "${payload.event}"`);
        return;
    }
    client.write(`data: ${JSON.stringify(payload)}\n\n`);
}
async function callGeminiApi(prompt) {
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
function getVideoDurationSeconds(segments) {
    if (segments.length === 0)
        return 0;
    return segments[segments.length - 1].end;
}
function calculateTargetQuizCount(durationSeconds) {
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
function chunkTranscriptByCount(segments, targetCount) {
    if (segments.length === 0)
        return [];
    const totalDuration = getVideoDurationSeconds(segments);
    const intervalSeconds = totalDuration / targetCount;
    const chunks = [];
    let currentText = "";
    let chunkIndex = 0;
    let nextCheckpointSeconds = intervalSeconds;
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (!segment.text.trim())
            continue;
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
function buildQuizGenerationPrompt(transcriptText, chunkIndex = 0, totalChunks = 1, durationMinutes = 3) {
    const positionPercent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    const isEarlyChunk = chunkIndex < Math.ceil(totalChunks * 0.33);
    const isLateChunk = chunkIndex >= Math.ceil(totalChunks * 0.66);
    const cognitiveLevel = isEarlyChunk
        ? "comprehension and recall (Bloom's Level 1–2: Remember / Understand) — test whether the learner grasped the core concept just introduced"
        : isLateChunk
            ? "analysis and application (Bloom's Level 3–4: Apply / Analyze) — test whether the learner can use or reason about the concept, not just recall it"
            : "conceptual understanding and application (Bloom's Level 2–3: Understand / Apply) — test whether the learner understands the mechanism behind the concept";
    const depthNote = durationMinutes >= 10
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
5. **Adaptive explanation.** The explanation must: (a) clearly state why the correct answer is right using evidence from the transcript, and (b) address the most tempting wrong answer and explain why it fails.
6. **Language matching.** Detect the language of the transcript and write the entire question, all options, and the explanation in that SAME language.

## Strict Output Format
Return ONLY a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "question": "A clear, conceptual question ending with a question mark?",
  "options": ["Correct answer text", "Plausible wrong answer", "Plausible wrong answer", "Plausible wrong answer"],
  "correct_answer": "Correct answer text",
  "explanation": "The correct answer is [X] because [evidence from transcript]. A common mistake is choosing [distractor] because [why it seems right], but [why it is actually wrong]."
}

CRITICAL: The value of "correct_answer" must be an exact character-for-character copy of one of the strings in the "options" array.

## Transcript Excerpt
"""
${transcriptText}
"""`;
}
function buildFullAssessmentPrompt(fullTranscript) {
    return `You are an Expert Instructional Designer creating a final summative assessment for an educational video.
I will provide you with the full transcript of the video. 

Your task is to generate EXACTLY 10 questions based on the entire transcript. 
The questions must test deep comprehension, not just surface-level recall.

## Question Type Distribution Requirements
You must provide a mix of question types. Aim for approximately:
- 5 Multiple Choice Questions (multiple_choice)
- 3 Short Answer / Fill-in-the-blank Questions (short_answer)
- 2 Essay Questions (essay)

## Formatting Rules per Question Type
1. **multiple_choice**: 
   - Must have exactly 4 plausible options in the "metadata" array.
   - "correct_answers" must contain an array with exactly one string (the exact text of the correct option).
2. **short_answer**: 
   - "metadata" must be null or an empty array.
   - "correct_answers" must contain an array of 1 to 3 acceptable exact string matches.
3. **essay**: 
   - "metadata" must be null.
   - "correct_answers" must contain the AI Evaluation Rubric (key points the student must mention for a perfect score).

## Strict Output Format
Return ONLY a valid JSON array containing exactly 10 objects. Do not wrap it in markdown blockquotes (\`\`\`json). Just the raw array.

[
  {
    "type": "multiple_choice", // or "short_answer" or "essay"
    "difficulty_level": 3, // integer between 1 (easy) and 5 (hard)
    "question": "Clear, contextual question text?",
    "metadata": ["Option 1", "Option 2", "Option 3", "Option 4"], // Only for multiple_choice
    "correct_answers": ["Option 2"], // See rules above based on type
    "explanation": "Why this answer is correct and why common misconceptions are wrong."
  }
]

## Full Video Transcript
"""
${fullTranscript}
"""`;
}
function buildAuthHeaders(token) {
    return {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
    };
}
function createMcpServer() {
    const server = new McpServer({
        name: "MCP Server",
        version: "1.0.0",
    });
    // Tool: getCurrentUser 
    server.tool("getCurrentUser", "Get information about the currently logged-in user", {
        token: z.string().describe("Bearer token of the currently logged-in user"),
    }, async ({ token }) => {
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
    });
    // Tool: analyzeVideoAudioPaths 
    server.tool("analyzeVideoAudioPaths", "Fetch user's video data and use Gemini to answer questions about their audio paths", {
        token: z.string().describe("Bearer token of the currently logged-in user"),
        prompt: z.string().describe("Question or instruction for Gemini about the audio path data"),
    }, async ({ token, prompt }) => {
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
        const audioPathData = videoList.map((video) => ({
            id: video.id,
            title: video.title,
            audio_path: video.mp3_audio_path ?? null,
        }));
        const fullPrompt = `Here is the user's video audio path data:\n${JSON.stringify(audioPathData, null, 2)}\n\nTask: ${prompt}\n\nAnalyze strictly based on the provided data.`;
        const aiAnswer = await callGeminiApi(fullPrompt);
        return { content: [{ type: "text", text: aiAnswer }] };
    });
    // Tool: generateAdaptiveVideoQuizzes 
    server.tool("generateAdaptiveVideoQuizzes", "Generate adaptive multiple-choice quizzes from video transcripts. Quiz count and intervals are automatically calculated from video duration. Minimum 3 quizzes for videos under 5 minutes, minimum 4 for videos over 5 minutes, maximum 10 for videos 10 minutes or longer.", {
        token: z.string().describe("Bearer token of the currently logged-in user"),
        userId: z.union([z.number(), z.string()]).describe("User ID for realtime progress notifications"),
        videoId: z.union([z.number(), z.string()]).describe("ID of the target video"),
        intervalMinutes: z
            .number()
            .optional()
            .describe("Optional: override the auto-calculated quiz interval (in minutes). When omitted, interval is determined dynamically from video duration."),
    }, async ({ token, userId, videoId, intervalMinutes }) => {
        const userIdStr = String(userId);
        emitNotificationToUser(userIdStr, {
            event: "quiz_generation_started",
            video_id: videoId,
            message: "Memulai pembuatan kuis adaptif...",
            progress: 0,
        });
        const transcriptResponse = await fetch(`${ENV.backendUrl}/videos/${videoId}/transcript`, { method: "GET", headers: buildAuthHeaders(token) });
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
        const transcriptSegments = transcriptBody.data ?? [];
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
        let targetQuizCount;
        if (intervalMinutes !== undefined && intervalMinutes > 0) {
            // Manual override: convert interval to count, then clamp to rules
            const rawCount = Math.ceil(durationSeconds / (intervalMinutes * 60));
            targetQuizCount = Math.min(10, Math.max(3, rawCount));
            console.log(`[Quiz] Manual interval override: ${intervalMinutes}min → clamped to ${targetQuizCount} quizzes`);
        }
        else {
            targetQuizCount = calculateTargetQuizCount(durationSeconds);
        }
        console.log(`[Quiz] videoId=${videoId} | duration=${durationMinutes.toFixed(1)}min | targetQuizzes=${targetQuizCount}`);
        emitNotificationToUser(userIdStr, {
            event: "quiz_generation_analyzing",
            video_id: videoId,
            message: `Video berdurasi ${durationMinutes.toFixed(1)} menit — akan membuat ${targetQuizCount} soal kuis...`,
            progress: 3,
            quiz_count: targetQuizCount,
            duration_minutes: Math.round(durationMinutes * 10) / 10,
        });
        const transcriptChunks = chunkTranscriptByCount(transcriptSegments, targetQuizCount);
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
        const generatedQuizzes = [];
        let failedChunkCount = 0;
        let lastErrorMessage = "Format kuis dari AI tidak valid.";
        for (let chunkIndex = 0; chunkIndex < transcriptChunks.length; chunkIndex++) {
            const chunk = transcriptChunks[chunkIndex];
            if (!chunk.text)
                continue;
            try {
                const prompt = buildQuizGenerationPrompt(chunk.text, chunkIndex, totalChunks, durationMinutes);
                const rawLlmOutput = await callGeminiApi(prompt);
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
                    const repairedOutput = await callGeminiApi(repairPrompt);
                    parsedQuiz = parseQuizFromLlmOutput(repairedOutput);
                }
                if (!parsedQuiz) {
                    throw new Error("Unable to extract a valid quiz format from LLM output after repair attempt.");
                }
                generatedQuizzes.push({ ...parsedQuiz, trigger_time: chunk.trigger_time });
            }
            catch (error) {
                failedChunkCount++;
                lastErrorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unknown error during quiz generation.";
                console.error(`[Quiz] Chunk ${chunkIndex + 1}/${totalChunks} failed: ${lastErrorMessage}`);
            }
            finally {
                const processedChunks = chunkIndex + 1;
                const progressPercent = Math.min(95, Math.round((processedChunks / totalChunks) * 100));
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
    });
    // Tool: generateFullAssessment
    server.tool("generateFullAssessment", "Generate a complete summative assessment with 10 mixed-type questions (5 MC, 3 short answer, 2 essay) from the full video transcript. Can run in parallel with adaptive quiz generation.", {
        token: z.string().describe("Bearer token of the currently logged-in user"),
        userId: z.union([z.number(), z.string()]).describe("User ID for realtime progress notifications"),
        videoId: z.union([z.number(), z.string()]).describe("ID of the target video"),
        parallelWithQuiz: z
            .boolean()
            .optional()
            .describe("If true (default), attempt parallel generation with quiz. If false, wait for quiz to complete first."),
    }, async ({ token, userId, videoId, parallelWithQuiz = true }) => {
        const userIdStr = String(userId);
        emitNotificationToUser(userIdStr, {
            event: "assessment_generation_started",
            video_id: videoId,
            message: "Memulai pembuatan penilaian ringkasan...",
            assessment_progress: 0,
            assessment_status: "starting",
        });
        const transcriptResponse = await fetch(`${ENV.backendUrl}/videos/${videoId}/transcript`, { method: "GET", headers: buildAuthHeaders(token) });
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
        const transcriptSegments = transcriptBody.data ?? [];
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
        let generatedQuestions = [];
        let failedAttempts = 0;
        const maxAttempts = 2;
        let lastErrorMessage = "Format penilaian dari AI tidak valid.";
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const prompt = buildFullAssessmentPrompt(fullTranscript);
                const rawLlmOutput = await callGeminiApi(prompt);
                let parsedQuestions = parseAssessmentFromLlmOutput(rawLlmOutput);
                if (!parsedQuestions || parsedQuestions.length === 0) {
                    const repairPrompt = `You returned malformed output. Fix it into this exact JSON schema and return ONLY a valid JSON array with exactly 10 objects — no markdown, no preamble:
                        [
                          {
                            "type": "multiple_choice",
                            "difficulty_level": 3,
                            "question": "string",
                            "metadata": ["string", "string", "string", "string"],
                            "correct_answers": ["string"],
                            "explanation": "string"
                          }
                        ]

                        Your previous output to fix:
                        ${rawLlmOutput}`;
                    const repairedOutput = await callGeminiApi(repairPrompt);
                    parsedQuestions = parseAssessmentFromLlmOutput(repairedOutput);
                }
                if (parsedQuestions && parsedQuestions.length >= 8) {
                    // Accept if we get at least 8 out of 10
                    generatedQuestions = parsedQuestions.slice(0, 10);
                    break;
                }
                else {
                    throw new Error(`Generated only ${parsedQuestions?.length ?? 0} valid questions, need at least 8.`);
                }
            }
            catch (error) {
                failedAttempts++;
                lastErrorMessage =
                    error instanceof Error
                        ? error.message
                        : "Unknown error during assessment generation.";
                console.error(`[Assessment] Attempt ${attempt + 1}/${maxAttempts} failed: ${lastErrorMessage}`);
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
        if (generatedQuestions.length < 8) {
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
        let saveError = false;
        // Try primary endpoint first
        try {
            const saveResponse = await fetch(`${ENV.backendUrl}/videos/${videoId}/assessments`, {
                method: "POST",
                headers: buildAuthHeaders(token),
                body: JSON.stringify({ questions: generatedQuestions }),
            });
            if (saveResponse.ok) {
                try {
                    const saveResult = await saveResponse.json();
                    savedAssessmentCount = saveResult.saved_count ?? generatedQuestions.length;
                    console.log(`[Assessment] Saved ${savedAssessmentCount} questions via primary endpoint`);
                }
                catch {
                    // Response OK but JSON parse failed, assume all saved
                    savedAssessmentCount = generatedQuestions.length;
                }
            }
            else {
                saveError = true;
                console.warn(`[Assessment] Primary save endpoint returned ${saveResponse.status}. Attempting fallback...`);
            }
        }
        catch (error) {
            saveError = true;
            console.error(`[Assessment] Primary endpoint request failed:`, error);
        }
        // Fallback: Try saving as individual questions if primary failed
        if (saveError) {
            console.log(`[Assessment] Using fallback: saving questions individually...`);
            savedAssessmentCount = 0;
            for (let qIndex = 0; qIndex < generatedQuestions.length; qIndex++) {
                const question = generatedQuestions[qIndex];
                try {
                    const fallbackResponse = await fetch(`${ENV.backendUrl}/questions`, {
                        method: "POST",
                        headers: buildAuthHeaders(token),
                        body: JSON.stringify({
                            video_id: videoId,
                            type: question.type,
                            difficulty_level: question.difficulty_level,
                            question: question.question,
                            metadata: question.metadata,
                            accepted_answers: question.correct_answers,
                            explanation: question.explanation,
                        }),
                    });
                    if (fallbackResponse.ok) {
                        savedAssessmentCount++;
                        console.log(`[Assessment] Saved question ${qIndex + 1}/${generatedQuestions.length}`);
                    }
                    else {
                        console.warn(`[Assessment] Failed to save question ${qIndex + 1}: HTTP ${fallbackResponse.status}`);
                    }
                }
                catch (error) {
                    console.error(`[Assessment] Error saving question ${qIndex + 1}:`, error);
                }
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
    });
    return server;
}
// Express app setup
const app = express();
const corsOptions = {
    origin: (requestOrigin, callback) => {
        if (!requestOrigin || ALLOWED_ORIGINS.includes(requestOrigin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin not allowed: ${requestOrigin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "mcp-protocol-version"],
};
app.use(cors(corsOptions));
app.options("/{*path}", cors(corsOptions));
function resolveAllowedOriginHeader(requestOrigin) {
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin))
        return requestOrigin;
    return ALLOWED_ORIGINS[0] ?? "http://localhost:3000";
}
// Routes
app.get("/notifications", (req, res) => {
    const userId = req.query.userId;
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
app.post("/webhook/transcription-done", express.json(), (req, res) => {
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
app.get("/sse", async (req, res) => {
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
app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = activeSSESessions.get(sessionId);
    if (!transport) {
        res.status(404).json({ error: "Session not found or expired." });
        return;
    }
    try {
        await transport.handlePostMessage(req, res);
    }
    catch (error) {
        console.error(`[SSE] Error handling message for session ${sessionId}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error while handling message." });
        }
    }
});
app.listen(ENV.port, "0.0.0.0", () => {
    console.log(`[Server] MCP SSE Server running on http://0.0.0.0:${ENV.port}`);
    console.log(`[Server] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
