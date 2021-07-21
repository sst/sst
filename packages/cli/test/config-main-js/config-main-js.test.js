const { runBuildCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the config.json is getting picked up
 */
test("config-main-js", async () => {
  const result = await runBuildCommand(__dirname);
  expect(result).toMatch(/config-main-js-prod-us-west-2/);
});
