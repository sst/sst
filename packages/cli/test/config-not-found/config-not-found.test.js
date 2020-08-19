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
test("config-not-found", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(/Add the sst.json config file/);
});
