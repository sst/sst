const fs = require("fs");
const path = require("path");
const {
  runBuildCommand,
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
test("nodejs-build-bundle-nodemodules", async () => {
  await runBuildCommand(__dirname, undefined, buildDir);

  const rootBuildPath = path.join(__dirname, buildDir);
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
