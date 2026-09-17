
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const arg = process.argv[2];

if (!arg) {
  console.error("Usage: npm run new-tool -- <tool_name>");
  console.error("       npm run new-tool -- weather/get_forecast   (nested under a subfolder)");
  process.exit(1);
}

if (!/^[a-zA-Z0-9_\-/]+$/.test(arg)) {
  console.error(`Invalid tool name "${arg}". Use letters, numbers, underscores, hyphens, and "/" for subfolders.`);
  process.exit(1);
}

const toolName = path.basename(arg).replace(/-/g, "_");
const relPath = `src/tools/${arg}.ts`;
const fullPath = path.resolve(process.cwd(), relPath);
const depth = arg.split("/").length; // used to compute the relative import to lib/

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await exists(fullPath)) {
    console.error(`Refusing to overwrite existing file: ${relPath}`);
    process.exit(1);
  }

  await mkdir(path.dirname(fullPath), { recursive: true });

  const upDirs = "../".repeat(depth);
  const contents = `import { z } from "zod";
import { defineTool } from "${upDirs}lib/defineTool.js";

export default defineTool({
  name: "${toolName}",
  description: "TODO: describe what this tool does and when a model should call it.",
  inputSchema: z.object({
    // TODO: define your arguments, e.g.:
    // query: z.string().describe("What to search for"),
  }),
  handler: async (input, ctx) => {
    ctx.logger.debug("${toolName} called", { requestId: ctx.requestId, input });
    // TODO: implement the tool.
    return "TODO: implement ${toolName}";
  },
});
`;

  await writeFile(fullPath, contents, "utf8");
  console.log(`Created ${relPath}`);
  console.log(`Next: fill in the TODOs, then run "npm run build && npm start".`);
}

main();
