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
test("stack-set-env", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).toMatch(/Do not set the "env" prop/);
});
