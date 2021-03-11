const fs = require("fs");
const path = require("path");
//const zipLocal = require("zip-local");
const { runBuildCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
  await clearBuildOutput(path.join(__dirname, "src"));
});

afterAll(async () => {
  //await clearBuildOutput(__dirname);
  //await clearBuildOutput(path.join(__dirname, 'src'));
});

/**
 * Test that the synth command ran successfully
 */
test("build-bundle-no-srcpath", async () => {
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
  let srcHandlerHash;
  srcBuildFiles.forEach((file) => {
    if (file.match(/^src-lambda-handler-[\d]+$/)) {
      srcHandlerHash = file;
    }
  });
  expect(srcHandlerHash).toBeDefined();
  // Verify package.json created and node_modules created
  expect(
    fs.existsSync(path.join(srcBuildPath, srcHandlerHash, "package.json"))
  ).toBeTruthy();
  expect(
    fs.existsSync(
      path.join(srcBuildPath, srcHandlerHash, "node_modules", "mirrarray")
    )
  ).toBeTruthy();

  /*
  // Verify build output files
  const handlerHashFiles = fs.readdirSync(path.join(buildPath, handlerHash));
  expect(handlerHashFiles).toHaveLength(2);
  expect(handlerHashFiles).toEqual(
    expect.arrayContaining([ 'lambda.js', 'lambda.js.map' ])
  );

  const srcHandlerHashFiles = fs.readdirSync(path.join(buildPath, srcHandlerHash));
  expect(srcHandlerHashFiles).toHaveLength(2);
  expect(srcHandlerHashFiles).toEqual(
    expect.arrayContaining([ 'lambda.js', 'lambda.js.map' ])
  );

  // Verify zip files generated
  expect(buildFiles).toEqual(
    expect.arrayContaining([
      expect.stringMatching(`${handlerHash}.zip`),
      expect.stringMatching(`${srcHandlerHash}.zip`),
    ])
  );

  // Verify zip files content
  const handlerZipDir = path.join(buildPath, `${handlerHash}-unzipped`);
  fs.mkdirSync(handlerZipDir);
  zipLocal.sync.unzip(path.join(buildPath, `${handlerHash}.zip`)).save(handlerZipDir);
  const handlerZipFiles = fs.readdirSync(handlerZipDir);
  expect(handlerZipFiles).toHaveLength(2);
  expect(handlerZipFiles).toEqual(
    expect.arrayContaining([ 'lambda.js', 'lambda.js.map' ])
  );

  const srcHandlerZipDir = path.join(buildPath, `${srcHandlerHash}-unzipped`);
  fs.mkdirSync(srcHandlerZipDir);
  zipLocal.sync.unzip(path.join(buildPath, `${srcHandlerHash}.zip`)).save(srcHandlerZipDir);
  const srcHandlerZipFiles = fs.readdirSync(srcHandlerZipDir);
  expect(srcHandlerZipFiles).toHaveLength(2);
  expect(srcHandlerZipFiles).toEqual(
    expect.arrayContaining([ 'lambda.js', 'lambda.js.map' ])
  );
  */
});
