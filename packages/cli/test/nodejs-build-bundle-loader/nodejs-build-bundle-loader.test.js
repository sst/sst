import fs from "fs";
import path from "path";
import { runBuildCommand, clearBuildOutput } from "../helpers";
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
test("nodejs-build-bundle-nodemodules", async () => {
  await runBuildCommand(__dirname);

  const rootBuildPath = path.join(__dirname, paths.appBuildDir);
  const rootBuildFiles = fs.readdirSync(rootBuildPath);

  // Verify build succeeded and build output generated
  let handlerHash;
  rootBuildFiles.forEach((file) => {
    if (file.match(/^lambda-handler-[\d]+$/)) {
      handlerHash = file;
    }
  });
  expect(handlerHash).toBeDefined();
});
