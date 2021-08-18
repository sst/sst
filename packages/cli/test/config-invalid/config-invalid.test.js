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
test("config-invalid", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);

  expect(result).toMatch(
    /There was a problem reading the sst.json config file/
  );
});
