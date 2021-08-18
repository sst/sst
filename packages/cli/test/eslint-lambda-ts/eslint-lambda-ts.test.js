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
 * Test that the synth command ran successfully
 */
test("eslint-cdk-ts", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);

  expect(result).toMatch(/is defined but never used/);
});
