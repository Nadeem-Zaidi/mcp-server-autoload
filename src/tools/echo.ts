import { z } from "zod";
import { defineTool } from "../lib/defineTool.js";
export default defineTool({
  name: "echo",
  description: "Echoes back whatever text you send it. Useful for testing the server is wired up correctly.",
  inputSchema: z.object({
    text: z.string().describe("Text to echo back"),
  }),
  handler: ({ text }) => `You said: ${text}`,
});
