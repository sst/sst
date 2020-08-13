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
test("stack-no-prefix", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(/Stack \(sample\) is not prefixed with the stage/);
});
