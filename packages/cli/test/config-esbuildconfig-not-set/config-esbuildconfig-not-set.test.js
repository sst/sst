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
test("config-esbuildconfig-not-set", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);
  expect(result).not.toContain("Esbuild config loaded");
  expect(result).toContain("prod-config-esbuildconfig-not-set-sample");
});
