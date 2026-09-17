import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDefinition, ToolContent } from "./defineTool.js";
import { logger } from "./logger.js";

export interface ServerInfo {
  name: string;
  version: string;
}
export function createMcpServer(tools: Map<string, ToolDefinition>, info: ServerInfo): McpServer {
  const server = new McpServer(info);

  for (const tool of tools.values()) {
    server.registerTool(
      tool.name,
      {
        ...(tool.title ? { title: tool.title } : {}),
        description: tool.description,
        inputSchema: tool.inputSchema.shape,
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      },
      async (args, extra) => {
        const requestId = randomUUID();
        try {
          const result = await tool.handler(args as Parameters<typeof tool.handler>[0], {
            requestId,
            signal: extra.signal ?? new AbortController().signal,
            logger,
          });
          return normalizeResult(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Error running "${tool.name}": ${message}`);
        }
      }
    );
  }

  return server;
}

function normalizeResult(result: unknown): { content: ToolContent[]; isError?: boolean } {
  if (result === undefined || result === null) {
    return { content: [{ type: "text", text: "" }] };
  }
  if (typeof result === "string") {
    return { content: [{ type: "text", text: result }] };
  }
  if (typeof result === "object" && "content" in (result as Record<string, unknown>)) {
    return result as { content: ToolContent[]; isError?: boolean };
  }
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
}
