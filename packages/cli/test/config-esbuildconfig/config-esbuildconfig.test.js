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
test("config-esbuildconfig", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);
  expect(result).toContain("Esbuild config loaded");
  expect(result).toContain("prod-config-esbuildconfig-sample");
});
