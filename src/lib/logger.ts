/**
 * Minimal structured logger.
 *
 * IMPORTANT: when running over the stdio MCP transport, stdout is reserved
 * exclusively for JSON-RPC protocol messages. Any stray console.log() will
 * corrupt the stream and break the client. All logging here goes to stderr.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentLevel(): Level {
  const fromEnv = (process.env.LOG_LEVEL ?? "").toLowerCase();
  return fromEnv in LEVEL_WEIGHT ? (fromEnv as Level) : "info";
}

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[currentLevel()]) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};

export type Logger = typeof logger;
