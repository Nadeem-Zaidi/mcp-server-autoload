#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadTools } from "./lib/loader.js";
import { logger } from "./lib/logger.js";
import { createMcpServer } from "./lib/createServer.js";

const SERVER_NAME = process.env.MCP_SERVER_NAME ?? "mcp-server-autoload";
const SERVER_VERSION = process.env.MCP_SERVER_VERSION ?? "1.0.0";

async function main(): Promise<void> {
  const tools = await loadTools();

  if (tools.size === 0) {
    logger.warn(
      "No tools loaded. Add a file under src/tools (see src/tools/echo.ts for an example), then `npm run build`."
    );
  } else {
    logger.info(`Ready with ${tools.size} tool(s): ${[...tools.keys()].join(", ")}`);
  }

  const server = createMcpServer(tools, { name: SERVER_NAME, version: SERVER_VERSION });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { error: reason instanceof Error ? reason.stack : String(reason) });
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.stack });
  process.exit(1);
});

main().catch((err) => {
  logger.error("Fatal error starting server", { error: err instanceof Error ? err.stack : String(err) });
  process.exit(1);
});
