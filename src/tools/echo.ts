import { z } from "zod";
import { defineTool } from "../lib/defineTool.js";

/**
 * The simplest possible tool — a template to copy when starting a new one.
 * Drop a new file anywhere under src/tools, `npm run build`, and it's live.
 */
export default defineTool({
  name: "echo",
  description: "Echoes back whatever text you send it. Useful for testing the server is wired up correctly.",
  inputSchema: z.object({
    text: z.string().describe("Text to echo back"),
  }),
  handler: ({ text }) => `You said: ${text}`,
});
