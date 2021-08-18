const {
  clearBuildOutput,
  runStartCommand,
  testBuildDir: buildDir,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, buildDir);
});

/**
 * Test that it doesn't break on relative handler paths
 */
test("nodejs-handler-relative-path", async () => {
  const result = await runStartCommand(__dirname, buildDir);
  expect(result).not.toMatch(/Failed to build the Lambda handlers/);
});
