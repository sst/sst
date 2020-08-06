const {
  runBuildCommand,
  clearBuildOutput,
  successRegex,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("base-ts", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(successRegex);
});
