const fs = require("fs");
const path = require("path");
const zipLocal = require("zip-local");
const {
  runBuildCommand,
  clearBuildOutput,
  defaultConfig: config,
} = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
  await clearBuildOutput(__dirname, config.buildDir, "service");
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
  await clearBuildOutput(__dirname, config.buildDir, "service");
});

/**
 * Test that the synth command ran successfully
 */
test("nodejs-build-no-bundle-srcpath", async () => {
  await runBuildCommand(__dirname, undefined, config);

  // Test eslint created build
  const appBuildPath = paths.configure(config).appBuildPath;
  const appBuildFiles = fs.readdirSync(appBuildPath);
  const srcPathBuildPath = path.join(appBuildPath, "service");
  const srcPathBuildFiles = fs.readdirSync(srcPathBuildPath);

  // Verify build output
  let handlerHash;
  let srcHandlerHash;
  srcPathBuildFiles.forEach((file) => {
    if (file.match(/^service-lambda-handler-[\d]+$/)) {
      handlerHash = file;
    } else if (file.match(/^service-src-lambda-handler-[\d]+$/)) {
      srcHandlerHash = file;
    }
  });
  expect(handlerHash).toBeDefined();
  expect(srcHandlerHash).toBeDefined();

  // Verify build output files
  const handlerHashFiles = fs.readdirSync(
    path.join(srcPathBuildPath, handlerHash)
  );
  expect(handlerHashFiles).toHaveLength(2);
  expect(handlerHashFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  const srcHandlerHashFiles = fs.readdirSync(
    path.join(srcPathBuildPath, srcHandlerHash)
  );
  expect(srcHandlerHashFiles).toHaveLength(2);
  expect(srcHandlerHashFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  // Verify zip files generated
  expect(appBuildFiles).toEqual(
    expect.arrayContaining([
      expect.stringMatching(`${handlerHash}.zip`),
      expect.stringMatching(`${srcHandlerHash}.zip`),
    ])
  );

  // Verify zip files content
  const handlerZipDir = path.join(appBuildPath, `${handlerHash}-unzipped`);
  fs.mkdirSync(handlerZipDir);
  zipLocal.sync
    .unzip(path.join(appBuildPath, `${handlerHash}.zip`))
    .save(handlerZipDir);
  const handlerZipFiles = fs.readdirSync(handlerZipDir);
  expect(handlerZipFiles).toHaveLength(3);
  expect(handlerZipFiles).toEqual(
    expect.arrayContaining(["lambda.js", "src", config.buildDir])
  );
  const handlerZipDotBuildFiles = fs.readdirSync(
    path.join(handlerZipDir, config.buildDir, handlerHash)
  );
  expect(handlerZipDotBuildFiles).toHaveLength(2);
  expect(handlerZipDotBuildFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  const srcHandlerZipDir = path.join(
    appBuildPath,
    `${srcHandlerHash}-unzipped`
  );
  fs.mkdirSync(srcHandlerZipDir);
  zipLocal.sync
    .unzip(path.join(appBuildPath, `${srcHandlerHash}.zip`))
    .save(srcHandlerZipDir);
  const srcHandlerZipFiles = fs.readdirSync(srcHandlerZipDir);
  expect(srcHandlerZipFiles).toHaveLength(3);
  expect(srcHandlerZipFiles).toEqual(
    expect.arrayContaining(["lambda.js", "src", config.buildDir])
  );
  const srcHandlerZipDotBuildFiles = fs.readdirSync(
    path.join(srcHandlerZipDir, config.buildDir, srcHandlerHash)
  );
  expect(srcHandlerZipDotBuildFiles).toHaveLength(2);
  expect(srcHandlerZipDotBuildFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(
    path.join(
      appBuildPath,
      "cdk.out",
      "prod-nodejs-build-no-bundle-srcpath-sample.template.json"
    )
  );
  const cfnResources = JSON.parse(cf).Resources;
  const cfnLambdas = Object.values(cfnResources).filter(
    (r) => r.Type === "AWS::Lambda::Function"
  );
  expect(cfnLambdas[0].Properties.Handler).toEqual(
    `.build/${handlerHash}/lambda.handler`
  );
  expect(cfnLambdas[1].Properties.Handler).toEqual(
    `.build/${srcHandlerHash}/lambda.handler`
  );
});
