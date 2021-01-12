const fs = require("fs");
const path = require("path");
const { runStartCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

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

  const testOutputPath = path.join(
    __dirname,
    paths.appBuildDir,
    "test-output.json"
  );
  const testOutput = JSON.parse(fs.readFileSync(testOutputPath, "utf8"));

  expect(testOutput).toMatchObject({
    entryPointsData: {
      "./lambda.js/handler": {
        outHandler: {
          entry: "lambda.js",
          handler: "handler",
          srcPath: ".build",
        },
      },
    },
  });
});
