const { runRemoveCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("remove", async () => {
  const result = await runRemoveCommand(__dirname);

  expect(result).toContain("app.skipBuild=true");
});
