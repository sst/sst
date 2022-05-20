import { test, expect } from "vitest";
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { hasOutput, countResources } from "./helper";
import * as cdk from "aws-cdk-lib";
import { App, Stack, Api } from "../src";

test("scope-Stage", async () => {
  const app = new App();
  const stage = new cdk.Stage(app, "stage");
  const stack = new Stack(stage, "stack");
  expect(app.stage).toBe("dev");
  expect(stack.stage).toBe("dev");
  countResources(stack, "AWS::CDK::Metadata", 1);
});

test("addOutputs", async () => {
  const stack = new Stack(new App(), "stack");
  stack.addOutputs({
    keyA: "valueA",
    keyB: { value: "valueB", exportName: "exportB" },
  });
  hasOutput(stack, "keyA", {
    Value: "valueA",
  });
  hasOutput(stack, "keyB", {
    Value: "valueB",
    Export: {
      Name: "exportB",
    },
  });
});

test("addOutputs-undefined-value", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    stack.addOutputs({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: Test undefined value
      keyA: stack.abc,
    });
  }).toThrow(/The stack output "keyA" is undefined/);
});

test("props: is construct", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const api = new Api(stack1, "api");
  expect(() => {
    // @ts-ignore: api is not StackProps type
    new Stack(app, "stack2", api);
  }).toThrow(
    /Expected an associative array as the stack props while initializing "stack2" stack. Received a construct instead./
  );
});

test("props: contains env", async () => {
  expect(() => {
    new Stack(new App(), "stack", {
      env: { account: "123", region: "us-east-1" },
    });
  }).toThrow(
    /Do not set the "env" prop while initializing "stack" stack \({"account":"123","region":"us-east-1"}\). Use the "AWS_PROFILE" environment variable and "--region" CLI option instead./
  );
});

test("getAllFunctions", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  new Api(stack1, "api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /test": "test/lambda.handler",
    },
  });

  expect(stack1.getAllFunctions().length).toBe(2);
});
