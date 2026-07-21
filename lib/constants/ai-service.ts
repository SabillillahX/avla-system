import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

export const aiService = {
  async callTool(toolName: string, args: Record<string, any>, options?: { timeout?: number }) {
    const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL
    const transport = new SSEClientTransport(new URL(`${mcpUrl}/sse`))
    const client = new Client({ name: "nextjs-client", version: "1.0.0" }, { capabilities: {} })

    try {
      await client.connect(transport)

      const result = await client.callTool({
        name: toolName,
        arguments: args
      }, undefined, { timeout: options?.timeout })

      return result
    } finally {
      try {
        client.close()
      } catch (e) {
        console.error("Error closing MCP client:", e)
      }
    }
  },

  callToolBackground(toolName: string, args: Record<string, any>) {
    this.callTool(toolName, args).catch(err => {
      console.error(`Error calling background tool ${toolName}:`, err)
    })
  }
}
