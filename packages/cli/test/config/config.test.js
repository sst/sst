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
 * Test that the config.json is getting picked up
 */
test("config", async () => {
  const result = await runBuildCommand(__dirname, undefined, buildDir);

  expect(result).toContain("krusty-krab-prod-jest-us-west-2");
});
