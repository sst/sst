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
test("config-entry-ts", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toB("krusty-krab-prod-jest-us-west-2");
});
