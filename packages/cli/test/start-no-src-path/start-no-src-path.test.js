import fs from "fs";
import path from "path";
import { runStartCommand, clearBuildOutput } from "../helpers";
import paths from "../../scripts/util/paths";

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
