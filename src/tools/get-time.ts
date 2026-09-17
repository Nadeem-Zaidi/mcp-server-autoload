import { z } from "zod";
import { defineTool } from "../lib/defineTool.js";

/**
 * Shows: optional fields with defaults, using the ctx.logger, and returning
 * structured data (auto-serialized to JSON text for the model).
 */
export default defineTool({
  name: "get_time",
  description: "Returns the current date and time, optionally in a specific IANA timezone (e.g. 'Asia/Kolkata').",
  inputSchema: z.object({
    timezone: z.string().optional().describe("IANA timezone name. Defaults to UTC if omitted."),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: ({ timezone }, ctx) => {
    const tz = timezone ?? "UTC";
    ctx.logger.debug("get_time called", { requestId: ctx.requestId, tz });

    const now = new Date();
    const formatted = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: tz,
    }).format(now);

    return {
      timezone: tz,
      iso: now.toISOString(),
      formatted,
    };
  },
});
