const { runCdkCommand, clearBuildOutput } = require("../helpers");

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

  expect(result).toMatch(/prod-cdknotes-sample/);
});
