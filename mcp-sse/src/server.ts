import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();

const mcpServer = new McpServer(
    { name: "simple-mcp-server", version: "1.0.0" },
    { capabilities: {} }
);

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);

    transports.set(transport.sessionId, transport);

    res.on("close", () => {
        transports.delete(transport.sessionId);
    });

    await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId || !transports.has(sessionId)) {
        res.status(400).json({ error: "Invalid sessionId" });
        return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handlePostMessage(req, res);
});

const PORT = Number(process.env.PORT) || 8081;
app.listen(PORT, () => {
    console.log(`MCP SSE running at http://localhost:${PORT}/sse`);
});