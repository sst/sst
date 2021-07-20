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
test("config-esbuildconfig-invalid", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(
    /Bad esbuild configuration/
  );
});
