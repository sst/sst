const fs = require("fs");
const path = require("path");
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

/**
 * Test that the start command ran successfully
 */
test("nodejs-build-bundle-esbuildconfig-start", async () => {
  await runStartCommand(__dirname, config);

  const testOutputPath = path.join(
    __dirname,
    config.buildDir,
    "test-output.json"
  );
  const testOutput = JSON.parse(fs.readFileSync(testOutputPath, "utf8"));

  expect(testOutput).toMatchObject({
    entryPointsData: {
      "./lambda.main": {
        outEntryPoint: {
          entry: "lambda.js",
          handler: "main",
          srcPath: config.buildDir,
        },
      },
    },
  });
});

/**
 * Test that the synth command ran successfully
 */
test("nodejs-build-bundle-esbuildconfig-build", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).toMatch(/Successfully compiled \d+ stack/);
});
