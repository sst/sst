const {
  runJestCommand,
  runBuildCommand,
  clearBuildOutput,
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
test("template-app-ts", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(/Successfully compiled \d+ stack/);
});

/**
 * Test that the jest tests run successfully
 */
test("template-app-ts-jest", async () => {
  const result = await runJestCommand(__dirname);

  expect(result).toContain("JESTTESTSUCCESS-----");
});
