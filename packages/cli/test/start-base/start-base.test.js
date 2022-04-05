const fs = require("fs");
const path = require("path");
const { runStartCommand, clearBuildOutput } = require("../helpers");
const { State } = require("@serverless-stack/core");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("start-base", async () => {
  console.log(await runStartCommand(__dirname));

  // Check --outputs-file
  const outputsPath = path.join(__dirname, "outputs.json");
  expect(fs.readFileSync(outputsPath, "utf8").trim()).toEqual("{}");

  // Check test outputs
  const funcs = State.Function.read(__dirname);
  expect(funcs).toMatchObject([
    {
      handler: "src/sns/sub-folder/sns.handler",
      srcPath: ".",
    },
    {
      handler: "api.main",
      srcPath: "src/api",
    },
  ]);
});
