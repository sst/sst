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

test("dotnet-build", async () => {
  await runBuildCommand(__dirname, undefined, buildDir);

  // Sample files
  //  .build/
  //    src-SampleFunction-SampleFunction::SampleFunction-Function::FunctionHandler-1628656125408/
  //      SampleFunction.dll

  // Verify build output
  const buildPath = path.join(__dirname, buildDir);
  const buildFiles = fs.readdirSync(buildPath);
  let buildFolder;
  buildFiles.forEach((file) => {
    if (
      file.match(
        /^src-SampleFunction-SampleFunction-SampleFunction-Function-FunctionHandler-[\d]+$/
      )
    ) {
      buildFolder = file;
    }
  });
  expect(buildFolder).toBeDefined();

  // Verify build output files
  const files = fs.readdirSync(path.join(buildPath, buildFolder));
  expect(files).toEqual(expect.arrayContaining(["SampleFunction.dll"]));

  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(
    path.join(buildPath, "cdk.out", "prod-dotnet-build-sample.template.json")
  );
  const cfnResources = JSON.parse(cf).Resources;
  const cfnLambdas = Object.values(cfnResources).filter(
    (r) => r.Type === "AWS::Lambda::Function"
  );
  expect(cfnLambdas[0].Properties.Handler).toEqual(
    "SampleFunction::SampleFunction.Function::FunctionHandler"
  );
});
