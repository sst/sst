const { runBuildCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("eslint-ts", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(/is defined but never used/);
});
