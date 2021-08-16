const {
  runJestCommand,
  runBuildCommand,
  clearBuildOutput,
  defaultConfig: config,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

/**
 * Test that the synth command ran successfully
 */
test("template-app-ts", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).toMatch(/Successfully compiled \d+ stack/);
});

/**
 * Test that the jest tests run successfully
 */
test("template-app-ts-jest", async () => {
  const result = await runJestCommand(__dirname);

  expect(result).toContain("JESTTESTSUCCESS-----");
});
