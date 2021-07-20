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
test("config-esbuildconfig-not-set", async () => {
  const result = await runBuildCommand(__dirname);
  expect(result).not.toContain("Esbuild config loaded");
  expect(result).toContain("prod-jest-config-esbuildconfig-not-set-sample");
});
