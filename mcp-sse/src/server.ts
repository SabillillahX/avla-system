import "dotenv/config";
import z from "zod";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req: express.Request, res: express.Response) => {
    const mcpServer = new McpServer(
        { name: "simple-mcp-server", version: "1.0.0" },
        { capabilities: {} }
    );

    // mcpServer.tool("getVideoData", "Get data video", async () => {
    //     console.log("Fetching video data...");
    //     const response = await fetch(`${BACKEND_URL}/videos`);
    //     const data = await response.json();
    //     return {
    //         content: [{ type: "text", text: JSON.stringify(data) }]
    //     };
    // });

    mcpServer.tool("getVideoData", "Get data video", async () => {
        console.log("Fetching dummy video data...");
        // Pakai public API sementara untuk testing
        const response = await fetch(`https://jsonplaceholder.typicode.com/posts/1`);
        const data = await response.json();

        return {
            content: [{ type: "text", text: JSON.stringify(data) }]
        };
    });

    mcpServer.tool(
        "generateQuestions",
        "Generate soal evaluasi otomatis dari ID video",
        {
            videoId: z.number().describe("ID dari video yang dipelajari"),
            difficulty: z.enum(["easy", "medium", "hard"]).describe("Tingkat kesulitan soal")
        },
        async ({ videoId, difficulty }) => {
            console.log(`Fetching dummy questions for video ID ${videoId}...`);

            // Fetch ke public API untuk mendapatkan raw data (simulasi ambil transkrip/materi)
            const response = await fetch(`https://jsonplaceholder.typicode.com/comments?postId=${videoId}`);
            const rawData = await response.json();

            // Kita olah data dari API publik tadi menjadi format "Soal"
            const generatedQuestions = rawData.slice(0, 3).map((item: any, index: number) => ({
                id: item.id,
                question: `Jelaskan apa yang dimaksud dengan: "${item.name}" berdasarkan materi video?`,
                type: difficulty === "hard" ? "essay" : "multiple_choice",
                source_email: item.email // Cuma buat bukti kalau datanya beneran dari API
            }));

            const result = {
                video_id: videoId,
                difficulty: difficulty,
                questions: generatedQuestions
            };

            return {
                content: [{ type: "text", text: JSON.stringify(result) }]
            };
        }
    );

    // ==========================================
    // TOOL 3: Evaluasi Jawaban Otomatis (Fetch API Publik)
    // ==========================================
    mcpServer.tool(
        "evaluateAnswer",
        "Evaluasi jawaban siswa secara otomatis",
        {
            questionId: z.number().describe("ID soal yang sedang dijawab"),
            studentAnswer: z.string().describe("Teks jawaban dari siswa")
        },
        async ({ questionId, studentAnswer }) => {
            console.log(`Evaluating answer for question ${questionId}...`);

            // Fetch ke API Quote untuk simulasi mendapatkan "Feedback AI" yang dinamis/berubah-ubah
            const response = await fetch(`https://dummyjson.com/quotes/random`);
            const aiFeedbackData = await response.json();

            // Simulasi perhitungan skor sederhana
            const isAnswerLongEnough = studentAnswer.trim().length > 10;
            const score = isAnswerLongEnough ? Math.floor(Math.random() * 20) + 80 : 40; // Random skor 80-100 atau 40

            const evaluationResult = {
                question_id: questionId,
                score: score,
                is_passed: score > 75,
                // Kita pakai quote acak dari API publik sebagai mock feedback AI
                ai_feedback: isAnswerLongEnough
                    ? `Bagus! Seperti kata pepatah: "${aiFeedbackData.quote}"`
                    : "Jawaban terlalu singkat, AI butuh lebih banyak konteks."
            };

            return {
                content: [{ type: "text", text: JSON.stringify(evaluationResult) }]
            };
        }
    );

    const transport = new SSEServerTransport("/messages", res as any);
    transports.set(transport.sessionId, transport);
    res.on("close", () => {
        transports.delete(transport.sessionId);
    });

    await mcpServer.connect(transport);
});

app.post("/messages", async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: "Invalid sessionId" });
        return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handlePostMessage(req as any, res as any);
});

const PORT = Number(process.env.PORT);
app.listen(PORT, () => {
    console.log(`MCP SSE running at http://localhost:${PORT}/sse`);
});