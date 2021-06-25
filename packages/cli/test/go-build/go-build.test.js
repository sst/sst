const fs = require("fs");
const path = require("path");
const { runBuildCommand, clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

test("go-build", async () => {
  await runBuildCommand(__dirname);

  // Sample files
  //  .build/
  //    src-root-main-go-1617382770587/
  //      handler
  //    no-srcPath-no-filename-src-1617382773549/
  //      handler
  //    no-srcPath-with-filename-src-main-go-1617382773051/
  //      handler
  //    with-srcPath-no-filename-src-1617388493649/
  //      handler
  //    with-srcPath-with-filename-src-main-go-1617388493046/
  //      handler

  // Verify build output
  const buildPath = path.join(__dirname, paths.appBuildDir);
  const buildFiles = fs.readdirSync(buildPath);
  let srcRootHash;
  let noSrcPathNoFilenameHash;
  let noSrcPathWithFilenameHash;
  let withSrcPathNoFilenameHash;
  let withSrcPathWithFilenameHash;
  buildFiles.forEach((file) => {
    if (file.match(/^src-root-main-go-[\d]+$/)) {
      srcRootHash = file;
    } else if (file.match(/^no-srcPath-no-filename-src-[\d]+$/)) {
      noSrcPathNoFilenameHash = file;
    } else if (file.match(/^no-srcPath-with-filename-src-main-go-[\d]+$/)) {
      noSrcPathWithFilenameHash = file;
    } else if (file.match(/^with-srcPath-no-filename-src-[\d]+$/)) {
      withSrcPathNoFilenameHash = file;
    } else if (file.match(/^with-srcPath-with-filename-src-main-go-[\d]+$/)) {
      withSrcPathWithFilenameHash = file;
    }
  });
  expect(srcRootHash).toBeDefined();
  expect(noSrcPathNoFilenameHash).toBeDefined();
  expect(noSrcPathWithFilenameHash).toBeDefined();
  expect(withSrcPathNoFilenameHash).toBeDefined();
  expect(withSrcPathWithFilenameHash).toBeDefined();

  const hashes = [
    srcRootHash,
    noSrcPathNoFilenameHash,
    noSrcPathWithFilenameHash,
    withSrcPathNoFilenameHash,
    withSrcPathWithFilenameHash,
  ];

  // Verify build output files
  hashes.forEach((hash) => {
    const files = fs.readdirSync(path.join(buildPath, hash));
    expect(files).toHaveLength(1);
    expect(files).toEqual(expect.arrayContaining(["handler"]));
  });

  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(
    path.join(buildPath, "cdk.out", "prod-go-build-sample.template.json")
  );
  const cfnResources = JSON.parse(cf).Resources;
  const cfnLambdas = Object.values(cfnResources).filter(
    (r) => r.Type === "AWS::Lambda::Function"
  );
  expect(cfnLambdas[0].Properties.Handler).toEqual("handler");
  expect(cfnLambdas[1].Properties.Handler).toEqual("handler");
  expect(cfnLambdas[2].Properties.Handler).toEqual("handler");
  expect(cfnLambdas[3].Properties.Handler).toEqual("handler");
  expect(cfnLambdas[4].Properties.Handler).toEqual("handler");
});
