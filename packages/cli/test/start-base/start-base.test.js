import fs from "fs";
import path from "path";
import { runBuildCommand, runStartCommand, clearBuildOutput } from "../helpers";
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
test("start-base", async () => {
  console.log(await runStartCommand(__dirname));

  // Check --outputs-file
  const outputsPath = path.join(__dirname, "outputs.json");
  expect(fs.readFileSync(outputsPath, "utf8").trim()).toEqual("{}");
});
