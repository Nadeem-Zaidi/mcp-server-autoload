import { test } from "node:test";
import assert from "node:assert/strict";
import { tools } from "./math.js";

const add = tools.find((t) => t.name === "add")!;
const divide = tools.find((t) => t.name === "divide")!;

test("add returns the sum", async () => {
  const input = add.inputSchema.parse({ a: 2, b: 3 });
  const result = await add.handler(input, fakeCtx());
  assert.equal(result, "5");
});

test("divide rejects zero denominator", async () => {
  const input = divide.inputSchema.parse({ numerator: 10, denominator: 0 });
  await assert.rejects(async () => divide.handler(input, fakeCtx()), /Cannot divide by zero/);
});

function fakeCtx() {
  return {
    requestId: "test",
    signal: new AbortController().signal,
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  };
}
