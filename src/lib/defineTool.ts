import type { z, ZodObject, ZodRawShape } from "zod";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "./logger.js";

/**
 * Everything a tool handler gets besides its parsed input.
 */
export interface ToolContext {
  /** Unique id for this call, useful for correlating log lines. */
  requestId: string;
  /** Aborts if the client cancels the request. Pass to fetch()/long-running work. */
  signal: AbortSignal;
  /** Writes to stderr (never stdout — stdout is reserved for the MCP protocol). */
  logger: Logger;
}

/**
 * Re-exported from the SDK rather than hand-rolled, so this always matches
 * exactly what the protocol (and McpServer) actually accepts — a resource
 * block needs `text` *or* `blob`, an image block needs both `data` and
 * `mimeType`, etc. Use it directly if you return a content array yourself.
 */
export type ToolContent = ContentBlock;

export type ToolHandlerResult =
  | string
  | { content: ToolContent[]; isError?: boolean }
  | Record<string, unknown>
  | void;

/**
 * The contract every file in src/tools (or a subfolder of it) must satisfy.
 * Build one with defineTool() so you get full type inference on `handler`'s
 * input from `inputSchema` — no manual typing required.
 */
export interface ToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  /** Unique tool name, e.g. "get_weather". Must be unique across every tool file. */
  name: string;
  /** Optional human-friendly title shown by some clients. */
  title?: string;
  /** Shown to the model — be specific about what the tool does and when to use it. */
  description: string;
  /** A z.object({ ... }) describing the tool's arguments. Use z.object({}) for no args. */
  inputSchema: ZodObject<Shape>;
  /** Optional hints some MCP clients use for UX (e.g. confirming destructive actions). */
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  /** Your tool's logic. Return a string, a structured object, or an MCP content array. */
  handler: (
    input: z.infer<ZodObject<Shape>>,
    ctx: ToolContext
  ) => Promise<ToolHandlerResult> | ToolHandlerResult;
}

/**
 * Identity helper that gives you type inference for `handler`'s input.
 * Purely compile-time sugar — at runtime it just returns what you passed in.
 *
 * @example
 * export default defineTool({
 *   name: "add",
 *   description: "Add two numbers together",
 *   inputSchema: z.object({ a: z.number(), b: z.number() }),
 *   handler: ({ a, b }) => `${a + b}`,
 * });
 */
export function defineTool<Shape extends ZodRawShape>(
  definition: ToolDefinition<Shape>
): ToolDefinition<Shape> {
  return definition;
}
