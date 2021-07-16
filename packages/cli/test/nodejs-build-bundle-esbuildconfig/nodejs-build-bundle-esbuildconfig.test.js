const fs = require("fs");
const path = require("path");
const {
  runBuildCommand,
  runStartCommand,
  clearBuildOutput,
} = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the start command ran successfully
 */
test("nodejs-build-bundle-esbuildconfig-start", async () => {
  await runStartCommand(__dirname);

  const testOutputPath = path.join(
    __dirname,
    paths.appBuildDir,
    "test-output.json"
  );
  const testOutput = JSON.parse(fs.readFileSync(testOutputPath, "utf8"));

  expect(testOutput).toMatchObject({
    entryPointsData: {
      "./lambda.main": {
        outEntryPoint: {
          entry: "lambda.js",
          handler: "main",
          srcPath: ".build",
        },
      },
    },
  });
});

/**
 * Test that the synth command ran successfully
 */
test("nodejs-build-bundle-esbuildconfig-build", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch(/Successfully compiled \d+ stack/);
});
