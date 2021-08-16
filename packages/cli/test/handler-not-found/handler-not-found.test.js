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
test("handler-not-found", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).toMatch(/Cannot find app handler/);
});
