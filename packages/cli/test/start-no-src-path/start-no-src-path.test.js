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
test("start-no-src-path", async () => {
  await runStartCommand(__dirname);
  const funcs = State.Function.read(__dirname);
  expect(funcs).toMatchObject([
    {
      handler: "lambda.handler",
      runtime: "nodejs14.x",
    },
  ]);
});
