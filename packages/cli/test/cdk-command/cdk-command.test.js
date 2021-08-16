const {
  runCdkCommand,
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
 * Test that the synth command ran successfully
 */
test("cdk-command", async () => {
  const result = await runCdkCommand(__dirname, "list", config.buildDir);

  expect(result).toMatch(/prod-cdk-command-sample/);
});
