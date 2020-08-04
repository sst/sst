const { runBuildCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the cdk.context.json is getting picked up
 */
test("context", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toContain("test_context_value");
});
