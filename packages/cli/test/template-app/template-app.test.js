const {
  runJestCommand,
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
test("template-app", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);

  expect(result).toMatch(/Successfully compiled \d+ stack/);
});

/**
 * Test that the jest tests run successfully
 */
test("template-app-jest", async () => {
  const result = await runJestCommand(__dirname);

  expect(result).toContain("JESTTESTSUCCESS-----");
});
