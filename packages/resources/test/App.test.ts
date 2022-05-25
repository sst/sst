import { test, expect } from "vitest";
import { hasResource, hasResourceTemplate } from "./helper";
import { Bucket } from "aws-cdk-lib/aws-s3";
import * as logs from "aws-cdk-lib/aws-logs";

export type AccessLogRetentionConfig =
  | keyof typeof logs.RetentionDays
  | logs.RetentionDays;

import { App, AppDeployProps, Auth, Stack } from "../src";

test("non-namespaced-props", async () => {
  const deployProps = {} as AppDeployProps;
  expect(deployProps).toBeDefined();
});

test("namespaced-props", async () => {
  const deployProps = {} as AppDeployProps;
  expect(deployProps).toBeDefined();
});

test("defaultRemovalPolicy", () => {
  const app = new App();
  app.setDefaultRemovalPolicy("destroy");
  const stack = new Stack(app, "stack");
  new Auth(stack, "Auth", {});
  hasResourceTemplate(stack, "AWS::Cognito::UserPool", {
    DeletionPolicy: "Delete",
  });
});

test("defaultRemovalPolicy bucket", () => {
  const app = new App();
  app.setDefaultRemovalPolicy("destroy");
  const stack = new Stack(app, "stack");
  new Bucket(stack, "Bucket");
  hasResource(stack, "Custom::S3AutoDeleteObjects", {});
});

test("stackName is default", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(stack.stackName).toBe("dev-my-app-stack");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("stackName is parameterized", () => {
  const app = new App();
  const stack = new Stack(app, "stack", {
    stackName: "my-app-dev-stack",
  });
  expect(stack.stackName).toBe("my-app-dev-stack");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("stackName is not parameterized", () => {
  const app = new App();
  new Stack(app, "stack", {
    stackName: "my-stack",
  });
  expect(() => {
    app.synth();
  }).toThrow(
    /Stack "my-stack" is not parameterized with the stage name. The stack name needs to either start with "\$stage-", end in "-\$stage", or contain the stage name "-\$stage-"./
  );
});

test("stack tags", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  app.synth();
  expect(stack.tags.tagValues()).toEqual({
    "sst:app": "my-app",
    "sst:stage": "dev",
  });
});
