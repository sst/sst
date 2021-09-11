const { runBuildCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("config-esbuildconfig-non-plugins", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toContain("Esbuild config loaded");
  expect(result).toMatch(/Cannot configure the "dummy" option/);
});
