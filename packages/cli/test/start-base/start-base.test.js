const fs = require("fs");
const path = require("path");
const {
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

/**
 * Test that the synth command ran successfully
 */
test("start-base", async () => {
  await runStartCommand(__dirname, buildDir);

  const testOutputPath = path.join(__dirname, buildDir, "test-output.json");
  const testOutput = JSON.parse(fs.readFileSync(testOutputPath, "utf8"));

  expect(testOutput).toMatchObject({
    entryPointsData: {
      "./src/sns/sub-folder/sns.handler": {
        outEntryPoint: {
          entry: "sns.js",
          handler: "handler",
          srcPath: path.normalize(`${buildDir}/src/sns/sub-folder`),
        },
      },
      "src/api/api.main": {
        outEntryPoint: {
          entry: "api.js",
          handler: "main",
          srcPath: path.normalize(`${buildDir}/src/api`),
        },
      },
    },
  });
});
