const fs = require("fs");
const path = require("path");
const zipLocal = require("zip-local");
const { runBuildCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the synth command ran successfully
 */
test("build-bundle-no-srcpath", async () => {
  await runBuildCommand(__dirname);

  // Test eslint created build
  const buildPath = path.join(__dirname, paths.appBuildDir);
  const buildFiles = fs.readdirSync(buildPath);
  // Sample files
  //  [
  //    '.esbuild.lambda-handler.json',
  //    '.esbuild.src-lambda-handler.json',
  //    'cdk.out',
  //    'eslint.js',
  //    'lambda-handler-1612170130511',
  //    'lambda-handler-1612170130511.zip',
  //    'lib',
  //    'run.js',
  //    'src-lambda-handler-1612170130622',
  //    'src-lambda-handler-1612170130622.zip',
  //    'sst-debug.log',
  //    'sst-merged.json'
  //  ]

  // Verify build output
  let handlerHash;
  let srcHandlerHash;
  buildFiles.forEach(file => {
    if (file.match(/^lambda-handler-[\d]+$/)) {
      handlerHash = file;
    }
    else if (file.match(/^src-lambda-handler-[\d]+$/)) {
      srcHandlerHash = file;
    }
  });
  expect(handlerHash).toBeDefined();
  expect(srcHandlerHash).toBeDefined();

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

  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(path.join(buildPath, 'cdk.out', 'prod-build-bundle-no-srcpath-sample.template.json'));
  const cfnResources = JSON.parse(cf).Resources;
  const cfnLambdas = Object.values(cfnResources).filter(r => r.Type === 'AWS::Lambda::Function');
  expect(cfnLambdas[0].Properties.Handler).toEqual('lambda.handler');
  expect(cfnLambdas[1].Properties.Handler).toEqual('lambda.handler');
});
