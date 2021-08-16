const fs = require("fs");
const path = require("path");
const {
  runStartCommand,
  clearBuildOutput,
  defaultConfig: config,
} = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

/**
 * Test that the synth command ran successfully
 */
test("start-no-src-path", async () => {
  await runStartCommand(__dirname, config);

  const testOutputPath = path.join(
    __dirname,
    paths.DEFAULT_BUILD_DIR,
    "test-output.json"
  );
  const testOutput = JSON.parse(fs.readFileSync(testOutputPath, "utf8"));

  expect(testOutput).toMatchObject({
    entryPointsData: {
      "./lambda.handler": {
        outEntryPoint: {
          entry: "lambda.js",
          handler: "handler",
          srcPath: ".build",
        },
      },
    },
  });
});
