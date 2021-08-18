const {
  runRemoveCommand,
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
test("remove", async () => {
  const result = await runRemoveCommand(__dirname);

  expect(result).toContain("app.skipBuild=true");
});
