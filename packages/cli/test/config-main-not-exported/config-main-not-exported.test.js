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
test("config-main-not-exported", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);
  expect(result).toMatch(
    /Cannot find app handler. Make sure "infra\/index.js" has a default export./
  );
});
