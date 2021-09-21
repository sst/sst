const fs = require("fs");
const path = require("path");
const { runBuildCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
  await clearBuildOutput(path.join(__dirname, "src"));
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
  await clearBuildOutput(path.join(__dirname, "src"));
});

/**
 * Test that the synth command ran successfully
 */
test("nodejs-build-bundle-nodemodules", async () => {
  await runBuildCommand(__dirname);

  // Directory structure
  //  /
  //    .build/
  //      cdk.out/
  //      lambda-handler-1612170130511
  //      lambda-handler-1612170130511.zip
  //      src-lambda-handler-1612170130511.zip
  //    src/
  //      .build/
  //        src-lambda-handler-1612170130511
  //        src-lambda2-handler-1612170130511

  //////////////////////////////
  // Verify root Lambda's build output
  //////////////////////////////
  const rootBuildPath = path.join(__dirname, paths.appBuildDir);
  const rootBuildFiles = fs.readdirSync(rootBuildPath);
  // Verify folder exists
  let handlerHash;
  rootBuildFiles.forEach((file) => {
    if (file.match(/^lambda-handler-[\d]+$/)) {
      handlerHash = file;
    }
  });
  expect(handlerHash).toBeDefined();
  // Verify package.json created and node_modules created
  expect(
    fs.existsSync(path.join(rootBuildPath, handlerHash, "package.json"))
  ).toBeTruthy();
  expect(
    fs.existsSync(
      path.join(rootBuildPath, handlerHash, "node_modules", "mirrarray")
    )
  ).toBeTruthy();

  //////////////////////////////
  // Verify src Lambda's build output
  //////////////////////////////
  const srcBuildPath = path.join(__dirname, "src", paths.appBuildDir);
  const srcBuildFiles = fs.readdirSync(srcBuildPath);
  // Verify src Lambda's build output
  let srcHandlerHash1;
  let srcHandlerHash2;
  srcBuildFiles.forEach((file) => {
    if (file.match(/^src-lambda-handler-[\d]+$/)) {
      srcHandlerHash1 = file;
    } else if (file.match(/^src-lambda2-handler-[\d]+$/)) {
      srcHandlerHash2 = file;
    }
  });
  expect(srcHandlerHash1).toBeDefined();
  expect(srcHandlerHash2).toBeDefined();
  // Verify package.json created and node_modules created in srcHandlerHash1
  expect(
    fs.existsSync(path.join(srcBuildPath, srcHandlerHash1, "package.json"))
  ).toBeTruthy();
  expect(
    fs.existsSync(
      path.join(srcBuildPath, srcHandlerHash1, "node_modules", "mirrarray")
    )
  ).toBeTruthy();
  // Verify package.json NOT created and node_modules copied over in srcHandlerHash2
  expect(
    fs.existsSync(path.join(srcBuildPath, srcHandlerHash2, "package.json"))
  ).toBeFalsy();
  expect(
    fs.existsSync(
      path.join(srcBuildPath, srcHandlerHash2, "node_modules", "mirrarray")
    )
  ).toBeTruthy();
});
