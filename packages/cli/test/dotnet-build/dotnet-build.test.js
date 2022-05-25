import fs from "fs";
import path from "path";
import paths from "../../scripts/util/paths";
import { runBuildCommand, clearBuildOutput } from "../helpers";
import { beforeEach, afterAll, test, expect } from "vitest";

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

test("dotnet-build", async () => {
  await runBuildCommand(__dirname);

  // Sample files
  //  .build/
  //    src-SampleFunction-SampleFunction::SampleFunction-Function::FunctionHandler-1628656125408/
  //      SampleFunction.dll

  // Verify build output
  const buildPath = path.join(__dirname, paths.appBuildDir);

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
