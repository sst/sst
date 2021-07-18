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
test("config-entry-invalid", async () => {
  const result = await runBuildCommand(__dirname);
  expect(result).toMatch(
    /Cannot find app handler. Make sure to add a "stack\/index.js" file/
  );
});
