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
test("eslint-ignore-rule-ts", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);

  expect(result).not.toMatch(/is defined but never used\s*no-unused-vars/);
});
