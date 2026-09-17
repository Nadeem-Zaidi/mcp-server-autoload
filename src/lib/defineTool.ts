import type { z, ZodObject, ZodRawShape } from "zod";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "./logger.js";


export interface ToolContext {
  requestId: string;
  signal: AbortSignal;
  logger: Logger;
}


export type ToolContent = ContentBlock;

export type ToolHandlerResult =
  | string
  | { content: ToolContent[]; isError?: boolean }
  | Record<string, unknown>
  | void;


export interface ToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title?: string;
  description: string;
  inputSchema: ZodObject<Shape>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  handler: (
    input: z.infer<ZodObject<Shape>>,
    ctx: ToolContext
  ) => Promise<ToolHandlerResult> | ToolHandlerResult;
}


export function defineTool<Shape extends ZodRawShape>(
  definition: ToolDefinition<Shape>
): ToolDefinition<Shape> {
  return definition;
}
