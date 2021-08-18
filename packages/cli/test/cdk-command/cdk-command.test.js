const {
  runCdkCommand,
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
 * Test that the synth command ran successfully
 */
test("cdk-command", async () => {
  const result = await runCdkCommand(__dirname, "list", buildDir);

  expect(result).toMatch(/prod-cdk-command-sample/);
});
