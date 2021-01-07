const { runStartCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("start-no-src-path", async () => {
  const result = await runStartCommand(__dirname);

  expect(result).toMatch(
    /Error: Source path cannot be the project root for the MyLambda Lambda function/
  );
});
