import { z } from "zod";
import { defineTool } from "../lib/defineTool.js";

const add = defineTool({
  name: "add",
  description: "Add two numbers together.",
  inputSchema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
  handler: ({ a, b }) => String(a + b),
});

const divide = defineTool({
  name: "divide",
  description: "Divide the first number by the second.",
  inputSchema: z.object({
    numerator: z.number(),
    denominator: z.number(),
  }),
  annotations: { readOnlyHint: true },
  handler: ({ numerator, denominator }) => {
    if (denominator === 0) {
      throw new Error("Cannot divide by zero");
    }
    return String(numerator / denominator);
  },
});

export const tools = [add, divide];
export { add, divide };