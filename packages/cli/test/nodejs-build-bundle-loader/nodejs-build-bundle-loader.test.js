const fs = require("fs");
const path = require("path");
const {
  runBuildCommand,
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
 * Test that the synth command ran successfully
 */
test("nodejs-build-bundle-nodemodules", async () => {
  await runBuildCommand(__dirname, undefined, config);

  const rootBuildPath = path.join(__dirname, config.buildDir);
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
