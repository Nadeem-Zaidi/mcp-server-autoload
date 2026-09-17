import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ZodObject, ZodRawShape } from "zod";
import type { ToolDefinition } from "./defineTool.js";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TOOLS_DIR = process.env.MCP_TOOLS_DIR
  ? path.resolve(process.env.MCP_TOOLS_DIR)
  : path.resolve(__dirname, "../tools");

function isZodObject(value: unknown): value is ZodObject<ZodRawShape> {
  return !!value && typeof value === "object" && "_def" in (value as object) && "parse" in (value as object);
}

function isToolDefinition(value: unknown): value is ToolDefinition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    typeof candidate.description === "string" &&
    typeof candidate.handler === "function" &&
    isZodObject(candidate.inputSchema)
  );
}

async function walk(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".js")) continue;
    if (entry.name.endsWith(".test.js")) continue;
    if (entry.name.startsWith("_")) continue; // convention: leading underscore = shared helper, not a tool
    files.push(full);
  }
  return files;
}

function relFile(file: string): string {
  return path.relative(process.cwd(), file);
}

export async function loadTools(): Promise<Map<string, ToolDefinition>> {
  const tools = new Map<string, ToolDefinition>();
  const files = (await walk(TOOLS_DIR)).sort();

  if (files.length === 0) {
    logger.warn(`No tool files found under ${TOOLS_DIR}`);
    return tools;
  }

  for (const file of files) {
    let mod: Record<string, unknown>;
    try {
      mod = await import(pathToFileURL(file).href);
    } catch (err) {
      logger.error(`Failed to import ${relFile(file)} — skipping`, {
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const candidates: unknown[] = [];
    if (mod.default !== undefined) candidates.push(mod.default);
    if (mod.tool !== undefined) candidates.push(mod.tool);
    if (Array.isArray(mod.tools)) candidates.push(...mod.tools);
    for (const [key, value] of Object.entries(mod)) {
      if (["default", "tool", "tools"].includes(key)) continue;
      if (isToolDefinition(value)) candidates.push(value);
    }

    if (candidates.length === 0) {
      logger.warn(
        `Skipped ${relFile(file)}: no tool export found. Export a default (or "tool"/"tools[]") built with defineTool().`
      );
      continue;
    }

    for (const candidate of candidates) {
      if (!isToolDefinition(candidate)) {
        logger.warn(`Skipped an export in ${relFile(file)}: does not match the ToolDefinition shape.`);
        continue;
      }
      if (tools.has(candidate.name)) {
        logger.error(
          `Duplicate tool name "${candidate.name}" found in ${relFile(file)} — keeping the first one loaded, skipping this one.`
        );
        continue;
      }
      tools.set(candidate.name, candidate);
      logger.info(`Loaded tool "${candidate.name}"`, { file: relFile(file) });
    }
  }

  return tools;
}
