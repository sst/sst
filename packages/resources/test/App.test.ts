import { test, expect } from "vitest";
import {
  ANY,
  ABSENT,
  hasResource,
  hasResourceTemplate,
  countResourcesLike,
} from "./helper";
import { Bucket } from "aws-cdk-lib/aws-s3";
import * as logs from "aws-cdk-lib/aws-logs";

export type AccessLogRetentionConfig =
  | keyof typeof logs.RetentionDays
  | logs.RetentionDays;

import { Api, App, AppDeployProps, Cognito, Stack } from "../src";

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
  new Cognito(stack, "Auth", {});
  hasResourceTemplate(stack, "AWS::Cognito::UserPool", {
    DeletionPolicy: "Delete"
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
    stackName: "my-app-dev-stack"
  });
  expect(stack.stackName).toBe("my-app-dev-stack");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("stackName is not parameterized", () => {
  const app = new App();
  new Stack(app, "stack", {
    stackName: "my-stack"
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
    "sst:stage": "dev"
  });
});

test("construct id: not duplicate", () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  new Api(stackA, "A");
  new Api(stackB, "B");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("construct id: duplicate", () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  new Api(stackA, "A");
  new Api(stackB, "A");
  expect(() => {
    app.synth();
  }).toThrow(/Api with id "A" already exists/);
});

test("construct id: duplicate hyphen with underscore", () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  new Api(stackA, "A-");
  new Api(stackB, "A_");
  expect(() => {
    app.synth();
  }).toThrow(/You cannot have the same Api id with an underscore and hyphen/);
});

test("construct id: single char", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "A");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("construct id: starting with underscore", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "_A");
  expect(() => {
    app.synth();
  }).toThrow();
});

test("construct id: starting with hyphen", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "-A");
  expect(() => {
    app.synth();
  }).toThrow();
});

test("construct id: contain underscore", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "A_");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("construct id: contain hyphen", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "A-");
  expect(() => {
    app.synth();
  }).not.toThrow();
});

test("construct id: special char", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "A&B");
  expect(() => {
    app.synth();
  }).toThrow();
});

test("bindParameters", () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "my-api");
  countResourcesLike(stack, "AWS::SSM::Parameter", 1, {
    Name: "/sst/my-app/dev/Api/my_api/url",
  });
});

test("removeGovCloudUnsupportedResourceProperties us-east-1", () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    }
  });
  hasResource(stack, "AWS::Lambda::Function", {
    EphemeralStorage: ANY,
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    Tags: ANY,
  });
});

test("removeGovCloudUnsupportedResourceProperties us-gov-east-1", () => {
  const app = new App({
    region: "us-gov-east-1",
  });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    }
  });
  hasResource(stack, "AWS::Lambda::Function", {
    EphemeralStorage: ABSENT,
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    Tags: ABSENT,
  });
});
