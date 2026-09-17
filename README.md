# mcp-server-autoload

A production-ready MCP (Model Context Protocol) server in TypeScript. Drop a file in `src/tools`, and it's automatically discovered and exposed as a tool — no manual registration, no central switch statement.

## Why this exists

Most MCP server templates make you register every tool by hand in one big file. This one scans `src/tools` (recursively) at startup, imports every file it finds, and registers whatever tools it exports. Adding a tool is just: create a file, describe it, ship it.

## Quick start

```bash
npm install
npm run build
npm start
```

That starts the server on stdio — the standard MCP transport, used by Claude Desktop, Claude Code, and most MCP clients. It isn't meant to be run and watched directly; a client spawns it as a subprocess and talks to it over stdin/stdout.

For local development with auto-reload on file changes:

```bash
npm run dev
```

## Adding a tool

Fastest way — scaffold one:

```bash
npm run new-tool -- get_weather
```

This creates `src/tools/get-weather.ts` from a template. Fill in the TODOs:

```ts
import { z } from "zod";
import { defineTool } from "../lib/defineTool.js";

export default defineTool({
  name: "get_weather",
  description: "Get the current weather for a city. Use this whenever the user asks about weather conditions.",
  inputSchema: z.object({
    city: z.string().describe("City name, e.g. 'Bangalore'"),
  }),
  handler: async ({ city }, ctx) => {
    const res = await fetch(`https://example.com/weather?city=${encodeURIComponent(city)}`, {
      signal: ctx.signal,
    });
    const data = await res.json();
    return `${city}: ${data.tempC}°C, ${data.condition}`;
  },
});
```

Then:

```bash
npm run build && npm start
```

That's the whole workflow. No file anywhere else needs to change.

### Rules the loader follows

- Any `.ts` file under `src/tools` (including in subfolders — organize freely) is scanned.
- A file can export a tool as:
  - `export default defineTool({ ... })` — one tool per file (most common)
  - `export const tool = defineTool({ ... })` — same, named instead of default
  - `export const tools = [defineTool({...}), defineTool({...})]` — several related tools in one file
  - or several separate named exports, each built with `defineTool()`
- File names and folder names are just for your own organization — they don't affect the tool's registered `name`. The `name` field inside `defineTool()` is what the model sees and calls.
- Two tools can't share a `name`. If they do, the first one loaded wins and the server logs an error for the rest — it won't silently pick one.
- A filename starting with `_` (e.g. `_helpers.ts`) is skipped by the loader — use that prefix for shared code you don't want treated as a tool.
- `*.test.ts` files are skipped.

### What `defineTool` gives you

`defineTool` is a type-inference helper (it's a no-op at runtime — it just returns what you pass it). Because `handler`'s first argument type is inferred from `inputSchema`, you get full autocomplete and type-checking on your tool's arguments with zero manual typing.

`handler` receives `(input, ctx)`:

- `input` — your arguments, already validated and parsed by Zod. Invalid input never reaches your handler; the caller gets a clear validation error instead.
- `ctx.requestId` — unique id for this call, useful in logs.
- `ctx.signal` — an `AbortSignal` that fires if the client cancels the request. Pass it to `fetch()` or anything else that supports cancellation.
- `ctx.logger` — `debug/info/warn/error`. **Always use this instead of `console.log`.** stdout is reserved for the MCP protocol; anything else written there corrupts the connection.

`handler` can return:

- a `string` — wrapped as a single text content block automatically
- a plain object — auto-serialized to pretty-printed JSON text
- an MCP content array directly (`{ content: [{ type: "text", text: "..." }] }`) when you need images or resource references
- throw an `Error` — caught automatically and returned to the model as a tool-level error (`isError: true`). No try/catch boilerplate needed for the common case.

See the example tools for real patterns:

| File | Shows |
|---|---|
| `src/tools/echo.ts` | Minimal single tool |
| `src/tools/math.ts` | Multiple tools from one file, throwing on invalid input |
| `src/tools/get-time.ts` | Optional args, `ctx.logger`, returning structured data |
| `src/tools/web/fetch-url.ts` | Subfolder organization, async handler, respecting `ctx.signal` |

## Configuration

All optional, set as environment variables (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |
| `MCP_SERVER_NAME` | `mcp-server-autoload` | Name reported to clients |
| `MCP_SERVER_VERSION` | `1.0.0` | Version reported to clients |
| `MCP_TOOLS_DIR` | `dist/tools` | Where to load compiled tools from — override to load tools from a different directory without rebuilding, e.g. a mounted volume in production |

## Connecting a client

**Claude Desktop / Claude Code** — add to your MCP config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-server-autoload": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-autoload/dist/index.js"]
    }
  }
}
```

Restart the client after editing the config. Any tool you've added and rebuilt (`npm run build`) will show up.

## Testing

```bash
npm test
```

Uses Node's built-in test runner. `src/tools/math.test.ts` shows the pattern: import the tool, call `inputSchema.parse()` then `handler()` directly — no server needed to unit-test a tool's logic.

## Production deployment

```bash
docker build -t mcp-server-autoload .
docker run -i mcp-server-autoload
```

The `-i` flag matters — stdio transport needs an interactive stdin attached. Most MCP clients that spawn containers handle this for you.

If you're loading tools from outside the image (e.g. a mounted directory so ops can add tools without a rebuild), mount it and set `MCP_TOOLS_DIR`:

```bash
docker run -i -v /host/extra-tools:/app/dist/extra-tools -e MCP_TOOLS_DIR=/app/dist/extra-tools mcp-server-autoload
```

## Project layout

```
src/
  index.ts           # server bootstrap: wires the MCP protocol to the loaded tools
  lib/
    defineTool.ts     # the ToolDefinition contract + type-inference helper
    loader.ts          # recursively scans src/tools, imports, validates, registers
    logger.ts          # stderr-only structured logger (stdout is reserved for MCP)
  tools/               # <-- add files here; that's the whole integration surface
    echo.ts
    math.ts
    get-time.ts
    web/
      fetch-url.ts
scripts/
  new-tool.ts          # `npm run new-tool -- <name>` scaffolder
```

## Design notes (why it's built this way)

- **stdio transport, not HTTP.** This is what every major MCP client (Claude Desktop, Claude Code, Cursor, etc.) expects for locally-run servers. If you need a remote/HTTP server instead, swap `StdioServerTransport` in `src/index.ts` for the SDK's Streamable HTTP transport — the tool-loading and handler code doesn't change.
- **Validation at the edge.** Every tool call's arguments are parsed with the tool's own Zod schema before the handler ever runs, so handlers can trust their input types completely.
- **One bad tool file can't take down the server.** A file that fails to import, or exports something malformed, is logged and skipped — the rest of the tools still load.
- **Duplicate names are rejected loudly**, not silently overwritten, so you find out at startup, not when the wrong tool runs.
