const {
  runRemoveCommand,
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
test("remove", async () => {
  const result = await runRemoveCommand(__dirname);

  expect(result).toContain("app.skipBuild=true");
});
