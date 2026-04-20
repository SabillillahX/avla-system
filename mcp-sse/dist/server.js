import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
async function callGemini(prompt) {
    const GEMINI_API = process.env.GEMINI_API;
    if (!GEMINI_API)
        throw new Error("GEMINI_API key is missing in .env");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API}`;
    const reqBody = {
        contents: [{
                parts: [{ text: prompt }]
            }]
    };
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody)
    });
    if (!response.ok) {
        let errorMsg = "Unknown error";
        try {
            const errJson = await response.json();
            errorMsg = JSON.stringify(errJson);
        }
        catch (e) { }
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorMsg}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
}
function createMcpServer() {
    const server = new McpServer({
        name: "Sample MCP Server",
        version: "1.0.0",
    });
    server.tool("getCurrentUser", "Get information about the currently logged-in user", {
        token: z.string().describe("Bearer token of the currently logged-in user")
    }, async ({ token }) => {
        try {
            console.error("[Tool] getCurrentUser - Fetching /me endpoint");
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/me`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) {
                return {
                    content: [{ type: "text", text: `Failed to fetch user data: HTTP ${res.status}` }]
                };
            }
            const data = await res.json();
            return {
                content: [
                    {
                        type: "text",
                        text: `Logged-in User details: ${JSON.stringify(data)}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: `Error fetching user data: ${error.message}` }]
            };
        }
    });
    server.tool("analyzeVideoAudioPaths", "Read user's /videos data and use Gemini to analyze or answer questions specifically about their audio_paths", {
        token: z.string().describe("Bearer token of the currently logged-in user"),
        prompt: z.string().describe("Question or instruction for Gemini to execute over the audio_path data")
    }, async ({ token, prompt }) => {
        try {
            console.error("[Tool] analyzeVideoAudioPaths - Fetching /videos endpoint");
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/videos`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!res.ok) {
                return {
                    content: [{ type: "text", text: `Failed to fetch videos: HTTP ${res.status}` }]
                };
            }
            const jsonResponse = await res.json();
            const videoRecords = jsonResponse.data?.data || jsonResponse.data || [];
            const extractedData = videoRecords.map((v) => ({
                id: v.id,
                title: v.title,
                audio_path: v.mp3_audio_path || null
            }));
            const contextString = JSON.stringify(extractedData, null, 2);
            const fullPrompt = `Here is the current user's video data focusing on audio paths:\n${contextString}\n\nUser's Question/Task: ${prompt}\n\nPlease analyze based strictly on the provided data.`;
            console.error("[Tool] analyzeVideoAudioPaths - Calling Gemini API");
            const aiAnswer = await callGemini(fullPrompt);
            return {
                content: [
                    { type: "text", text: aiAnswer }
                ]
            };
        }
        catch (error) {
            return {
                content: [{ type: "text", text: `Error processing audio paths: ${error.message}` }]
            };
        }
    });
    server.tool("generateAdaptiveVideoQuizzes", "Generate adaptive multiple-choice quizzes based on video transcripts chunked by time intervals", {
        token: z.string().describe("Bearer token of the currently logged-in user"),
        videoId: z.union([z.number(), z.string()]).describe("The ID of the uploaded video"),
        intervalMinutes: z.number().optional().describe("The time interval in minutes to trigger a popup quiz (default 3)")
    }, async ({ token, videoId, intervalMinutes }) => {
        const interval = (intervalMinutes || 3) * 60;
        try {
            console.error(`[Tool] generateAdaptiveVideoQuizzes - Fetching transcript for video ${videoId}`);
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            if (!backendUrl)
                throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
            const transcriptRes = await fetch(`${backendUrl}/videos/${videoId}/transcript`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (!transcriptRes.ok) {
                const errText = await transcriptRes.text();
                return { content: [{ type: "text", text: `Failed to fetch transcript: ${transcriptRes.status} - ${errText}` }] };
            }
            const transcriptJson = await transcriptRes.json();
            const transcriptSegments = transcriptJson.data || [];
            if (!transcriptSegments.length) {
                return { content: [{ type: "text", text: "No transcript segments found for the video." }] };
            }
            // Chunking Logic (Time-Based)
            const timeChunkedTexts = [];
            let currentChunkText = "";
            let nextCheckpoint = interval;
            for (let i = 0; i < transcriptSegments.length; i++) {
                const segment = transcriptSegments[i];
                currentChunkText += segment.text + " ";
                if (segment.end >= nextCheckpoint || i === transcriptSegments.length - 1) {
                    timeChunkedTexts.push({
                        trigger_time: Math.round(segment.end),
                        text: currentChunkText.trim()
                    });
                    currentChunkText = "";
                    nextCheckpoint = segment.end + interval;
                }
            }
            console.error(`[Tool] generateAdaptiveVideoQuizzes - Generated ${timeChunkedTexts.length} time chunks.`);
            // LLM Question Generation
            const generatedQuizArray = [];
            for (const chunk of timeChunkedTexts) {
                if (!chunk.text)
                    continue;
                const prompt = `You are an E-Learning Instructional Designer and a Professional Educator. 

                    Your task is to create exactly 1 (one) multiple-choice question based on the following chunk of text from an educational video transcript.

                    Context: This question will appear as a "Pop-Up Quiz" that automatically pauses the video. The goal is to test the student's immediate focus and understanding of the concept that was *just* explained in this specific text chunk, not concepts from the entire video.

                    Question Generation Requirements:
                    1. The question must be clear, concise, and highly relevant to the text provided.
                    2. Provide exactly 4 reasonable answer options, without including the A/B/C/D labels inside the option text itself.
                    3. Provide the correct answer (the text must exactly match one of the options).
                    4. Provide a brief, educational 'explanation' of why this answer is correct, which will be used as adaptive feedback for the student.

                    RETURN YOUR ANSWER ONLY IN A VALID JSON FORMAT LIKE THE STRUCTURE BELOW WITHOUT ANY ADDITIONAL TEXT OR MARKDOWN:
                    {
                    "question": "Write the question here?",
                    "options": ["First option", "Second option", "Third option", "Fourth option"],
                    "correct_answer": "The correct option",
                    "explanation": "Explanation of why this option is correct."
                    }

                    Video Transcript Text:
                    """
                    ${chunk.text}
                    """
                    `;
                try {
                    const rawLlmResponse = await callGemini(prompt);
                    const cleanedResponse = rawLlmResponse.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
                    const parsedQuiz = JSON.parse(cleanedResponse);
                    if (parsedQuiz.question && parsedQuiz.options && parsedQuiz.correct_answer) {
                        generatedQuizArray.push({
                            trigger_time: chunk.trigger_time,
                            question: parsedQuiz.question,
                            options: parsedQuiz.options,
                            correct_answer: parsedQuiz.correct_answer,
                            explanation: parsedQuiz.explanation || ""
                        });
                    }
                }
                catch (err) {
                    console.error(`[Tool] Error generating/parsing quiz for chunk at ${chunk.trigger_time}:`, err.message);
                    continue;
                }
            }
            console.error(`[Tool] generateAdaptiveVideoQuizzes - Generated ${generatedQuizArray.length} valid quizzes.`);
            if (generatedQuizArray.length === 0) {
                return { content: [{ type: "text", text: "Proses selesai, namun tidak ada format kuis yang valid yang dihasilkan oleh LLM." }] };
            }
            // Save to Backend
            console.error(`[Tool] generateAdaptiveVideoQuizzes - Saving quizzes to backend.`);
            const saveRes = await fetch(`${backendUrl}/videos/${videoId}/quizzes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quizzes: generatedQuizArray })
            });
            if (!saveRes.ok) {
                const saveErrText = await saveRes.text();
                return { content: [{ type: "text", text: `Failed to save quizzes to backend: ${saveRes.status} - ${saveErrText}` }] };
            }
            const saveResult = await saveRes.json();
            return {
                content: [{
                        type: "text",
                        text: `Selesai! Berhasil memproses transkripsi dan membuat ${saveResult.saved_count || generatedQuizArray.length} pertanyaan kuis. Kuis telah disimpan ke database.`
                    }]
            };
        }
        catch (error) {
            console.error("[Tool] generateAdaptiveVideoQuizzes error:", error);
            return {
                content: [{ type: "text", text: `Error in generateAdaptiveVideoQuizzes: ${error.message}` }]
            };
        }
    });
    return server;
}
const app = express();
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true
}));
const PORT = process.env.PORT;
const transports = new Map();
app.get("/sse", async (req, res) => {
    console.error("[SSE] New connection received");
    const transport = new SSEServerTransport("/messages", res);
    const server = createMcpServer();
    await server.connect(transport);
    transports.set(transport.sessionId, transport);
    req.on("close", () => {
        console.error(`[SSE] Connection closed for session ${transport.sessionId}`);
        transports.delete(transport.sessionId);
    });
});
app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);
    if (!transport) {
        console.error(`[SSE] Transport not found for session ${sessionId}`);
        res.status(404).send("No active SSE connection or session expired.");
        return;
    }
    try {
        await transport.handlePostMessage(req, res);
    }
    catch (err) {
        console.error("[SSE] Error handling post message", err);
        if (!res.headersSent) {
            res.status(500).send("Error handling message");
        }
    }
});
app.listen(PORT, () => {
    console.error(`MCP SSE Server running at http://localhost:${PORT}/sse`);
    console.error(`MCP Messages endpoint at http://localhost:${PORT}/messages`);
});
