import {
  runBuildCommand,
  clearBuildOutput,
  runRemoveCommand,
} from "../helpers";
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
test("remove", async () => {
  const result = await runRemoveCommand(__dirname);

  expect(result).toContain("app.skipBuild=true");
});
