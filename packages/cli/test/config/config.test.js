const {
  runBuildCommand,
  clearBuildOutput,
  defaultConfig: config,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

/**
 * Test that the config.json is getting picked up
 */
test("config", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).toContain("krusty-krab-prod-jest-us-west-2");
});
