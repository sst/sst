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
test("eslint-ignore-patterns", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).not.toMatch(/is defined but never used/);
  expect(result).toMatch(/File ignored because of a matching ignore pattern./);
});
