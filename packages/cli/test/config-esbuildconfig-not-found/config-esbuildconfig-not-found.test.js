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
test("config-esbuildconfig-not-found", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(
    /Cannot find the esbuild config file at.*file-that-does-not-exist/
  );
});
