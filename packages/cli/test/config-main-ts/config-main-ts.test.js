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
test("config-main-ts", async () => {
  const result = await runBuildCommand(__dirname);
  expect(result).toMatch(/config-main-ts-prod-us-west-2/);
});
