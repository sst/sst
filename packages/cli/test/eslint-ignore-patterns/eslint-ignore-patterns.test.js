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
test("eslint-ignore-patterns", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).not.toMatch(/is defined but never used/);
  expect(result).toMatch(/File ignored because of a matching ignore pattern./);
});
