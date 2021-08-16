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
 * Test that the cdk.context.json is getting picked up
 */
test("context", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).toContain("test_context_value");
});
