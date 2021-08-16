const {
  clearBuildOutput,
  runStartCommand,
  defaultConfig: config,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

/**
 * Test that it doesn't break on relative handler paths
 */
test("nodejs-handler-relative-path", async () => {
  const result = await runStartCommand(__dirname, config);
  expect(result).not.toMatch(/Failed to build the Lambda handlers/);
});
