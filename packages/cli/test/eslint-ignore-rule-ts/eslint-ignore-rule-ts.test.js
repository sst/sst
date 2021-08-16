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
 * Test that the synth command ran successfully
 */
test("eslint-ignore-rule-ts", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).not.toMatch(/is defined but never used\s*no-unused-vars/);
});
