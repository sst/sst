import { runBuildCommand, clearBuildOutput } from "../helpers";

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("handler-not-found", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(/Cannot find app handler/);
});
