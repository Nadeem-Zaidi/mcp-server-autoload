import { z } from "zod";
import { defineTool } from "../../lib/defineTool.js";

export default defineTool({
  name: "fetch_url",
  description: "Fetches a URL over HTTP(S) and returns up to the first 5000 characters of the response body as text.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch"),
  }),
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ url }, ctx) => {
    const response = await fetch(url, { signal: ctx.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
    }
    const body = await response.text();
    const truncated = body.length > 5000 ? `${body.slice(0, 5000)}\n...[truncated]` : body;
    return `Status: ${response.status}\n\n${truncated}`;
  },
});
