const {
  runBuildCommand,
  runStartCommand,
  clearBuildOutput,
  defaultConfig: config,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

test("context", async () => {
  const buildResult = await runBuildCommand(__dirname, undefined, config);
  expect(buildResult).toContain("[IS_LOCAL=undefined]");

  const startResult = await runStartCommand(__dirname, config);
  expect(startResult).toContain("[IS_LOCAL=true]");
});
