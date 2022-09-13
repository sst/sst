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

test("go-build", async () => {
  await runBuildCommand(__dirname);

  // sample files
  //  .build/
  //    src-root-main-go-1617382770587/
  //      handler
  //    no-srcpath-no-filename-src-1617382773549/
  //      handler
  //    no-srcpath-with-filename-src-main-go-1617382773051/
  //      handler
  //    with-srcpath-no-filename-src-1617388493649/
  //      handler
  //    with-srcpath-with-filename-src-main-go-1617388493046/
  //      handler

  // Verify build output
  const buildPath = path.join(__dirname, paths.appBuildDir);
  // Verify CF Lambda resource handler
  const cf = fs.readFileSync(
    path.join(buildPath, "cdk.out", "prod-go-build-sample.template.json")
  );
  const cfnResources = JSON.parse(cf).Resources;
  const cfnLambdas = Object.values(cfnResources).filter(
    (r) => r.Type === "AWS::Lambda::Function" && r.Properties.Handler === "handler"
  );
  expect(cfnLambdas.length).toEqual(5);
});
