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
test("config-esbuildconfig-not-set", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);
  expect(result).not.toContain("Esbuild config loaded");
  expect(result).toContain("prod-config-esbuildconfig-not-set-sample");
});
