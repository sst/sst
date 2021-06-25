const fs = require("fs");
const path = require("path");
const { runBuildCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
  await clearBuildOutput(path.join(__dirname, "service"));
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
  await clearBuildOutput(path.join(__dirname, "service"));
});

/**
 * Test that the synth command ran successfully
 */
test("nodejs-build-bundle-srcpath", async () => {
  await runBuildCommand(__dirname);

  // Test eslint created build
  const appBuildPath = path.join(__dirname, paths.appBuildDir);
  const srcPathBuildPath = path.join(__dirname, "service", paths.appBuildDir);
  const srcPathBuildFiles = fs.readdirSync(srcPathBuildPath);

  // Verify build output
  let handlerHash;
  let srcHandlerHash;
  srcPathBuildFiles.forEach((file) => {
    if (file.match(/^service-lambda-handler-[\d]+$/)) {
      handlerHash = file;
    } else if (file.match(/^service-src-srcLambda-handler-[\d]+$/)) {
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
    expect.arrayContaining(["srcLambda.js", "srcLambda.js.map"])
  );

  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(
    path.join(
      appBuildPath,
      "cdk.out",
      "prod-nodejs-build-bundle-srcpath-sample.template.json"
    )
  );
  const cfnResources = JSON.parse(cf).Resources;
  const [cfnLambda1, cfnLambda2] = Object.values(cfnResources).filter(
    (r) => r.Type === "AWS::Lambda::Function"
  );
  expect(cfnLambda1.Properties.Handler).toEqual(`lambda.handler`);
  expect(cfnLambda2.Properties.Handler).toEqual(`srcLambda.handler`);

  // Verify CF Lambda asset files content
  const handlerAssets = cfnLambda1.Metadata["aws:asset:path"];
  const handlerZipFiles = fs.readdirSync(
    path.join(appBuildPath, "cdk.out", handlerAssets)
  );
  expect(handlerZipFiles).toHaveLength(2);
  expect(handlerZipFiles).toEqual(
    expect.arrayContaining(["lambda.js", "lambda.js.map"])
  );

  const srcHandlerAsset = cfnLambda2.Metadata["aws:asset:path"];
  const srcHandlerZipFiles = fs.readdirSync(
    path.join(appBuildPath, "cdk.out", srcHandlerAsset)
  );
  expect(srcHandlerZipFiles).toHaveLength(2);
  expect(srcHandlerZipFiles).toEqual(
    expect.arrayContaining(["srcLambda.js", "srcLambda.js.map"])
  );
});
