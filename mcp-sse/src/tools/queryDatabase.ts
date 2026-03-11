import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const server = new McpServer(
    { name: "simple-mcp-server", version: "1.0.0" },
    { capabilities: {} }
);

server.tool(
    "getUserData",
    "Get User Data",
    async () => {
        console.log("Getting user data...");
        const res = await fetch("http://localhost:8000/api/users")
        const getUser = await res.json();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(getUser)
                }
            ]
        }
    }
)

