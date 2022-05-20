import { runBuildCommand, clearBuildOutput } from "../helpers";
import { beforeEach, afterAll, test, expect } from "vitest";

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("typecheck-disabled-ts", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).not.toMatch(/is defined but never used/);
});
