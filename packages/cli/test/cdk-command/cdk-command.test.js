import { runCdkCommand, clearBuildOutput } from "../helpers";
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
test("cdk-command", async () => {
  const result = await runCdkCommand(__dirname, "list");

  expect(result).toMatch(/prod-cdk-command-sample/);
});
