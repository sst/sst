const {
  runBuildCommand,
  clearBuildOutput,
  testBuildDir: buildDir,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, buildDir);
});

/**
 * Test that the config.json is getting picked up
 */
test("config-main-not-exported", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);
  expect(result).toMatch(
    /Cannot find app handler. Make sure "infra\/index.js" has a default export./
  );
});
