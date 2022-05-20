import { runBuildCommand, runStartCommand, clearBuildOutput } from "../helpers";
import { beforeEach, afterAll, test, expect } from "vitest";

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

test("context", async () => {
  const buildResult = await runBuildCommand(__dirname);
  expect(buildResult).toContain("[IS_LOCAL=undefined]");

  const startResult = await runStartCommand(__dirname);
  expect(startResult).toContain("[IS_LOCAL=true]");
});
