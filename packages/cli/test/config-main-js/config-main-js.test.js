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
test("config-main-js", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);
  expect(result).toMatch(/config-main-js-prod-us-west-2/);
});
