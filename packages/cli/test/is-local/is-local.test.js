const {
  runBuildCommand,
  runStartCommand,
  clearBuildOutput,
  testBuildDir: buildDir,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, buildDir);
});

test("context", async () => {
  const buildResult = await runBuildCommand(__dirname, undefined, buildDir);
  expect(buildResult).toContain("[IS_LOCAL=undefined]");

  const startResult = await runStartCommand(__dirname, buildDir);
  expect(startResult).toContain("[IS_LOCAL=true]");
});
