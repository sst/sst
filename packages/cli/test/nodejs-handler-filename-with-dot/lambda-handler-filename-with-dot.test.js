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
 * Test that it doesn't break on handler filename with dot
 */
test("nodejs-handler-filename-with-dot", async () => {
  const result = await runStartCommand(__dirname, config);
  expect(result).not.toMatch(/Failed to build the Lambda handlers/);
});
