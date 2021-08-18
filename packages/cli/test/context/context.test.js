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
 * Test that the cdk.context.json is getting picked up
 */
test("context", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);

  expect(result).toContain("test_context_value");
});
