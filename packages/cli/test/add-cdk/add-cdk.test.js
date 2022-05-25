import { runAddCdkCommand, clearBuildOutput } from "../helpers";
import { beforeEach, afterAll, test, expect } from "vitest";

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

test("add-cdk CDK v1 packages", async () => {
  const result = await runAddCdkCommand(__dirname, "@aws-cdk/aws-sns");

  expect(result).toMatch(
    "@aws-cdk/aws-sns is an AWS CDK v1 package. Only v2 packages are supported"
  );
});

test("add-cdk CDK v2 packages", async () => {
  const result = await runAddCdkCommand(
    __dirname,
    "aws-cdk-lib @aws-cdk/aws-appsync-alpha"
  );

  expect(result).toMatch(
    /yarn add --exact aws-cdk-lib@\d+.\d+.\d+ @aws-cdk\/aws-appsync-alpha@\d+.\d+.\d+-alpha\.0/
  );
});
