import { test, expect } from "vitest";
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { hasOutput, hasNoOutput, countResources, createApp } from "./helper";
import * as cdk from "aws-cdk-lib";
import { App, Stack, Api } from "../../dist/constructs/";

test("scope-Stage", async () => {
  const app = await createApp();
  const stage = new cdk.Stage(app, "stage");
  const stack = new Stack(stage, "stack");
  expect(app.stage).toBe("test");
  expect(stack.stage).toBe("test");
});

test("addOutputs", async () => {
  const stack = new Stack(await createApp(), "stack");
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
  const stack = new Stack(await createApp(), "stack");
  stack.addOutputs({
    keyA: undefined,
  });
  hasNoOutput(stack, "keyA");
});

test("props: is construct", async () => {
  const app = await createApp();
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
  expect(async () => {
    new Stack(await createApp(), "stack", {
      env: { account: "123", region: "us-east-1" },
    });
  }).rejects.toThrow(
    /Do not set the "env" prop while initializing "stack" stack \({"account":"123","region":"us-east-1"}\). Use the "AWS_PROFILE" environment variable and "--region" CLI option instead./
  );
});

test("getAllFunctions", async () => {
  const app = await createApp();
  const stack1 = new Stack(app, "stack1");
  new Api(stack1, "api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /test": "test/lambda.handler",
    },
  });

  expect(stack1.getAllFunctions().length).toBe(2);
});

test("isActive: deploy mode", async () => {
  const app = await createApp({
    mode: "deploy",
  });
  const stack = new Stack(app, "stack");
  expect(stack.isActive).toBeTruthy();
});

test("isActive: deploy mode with active stacks", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return stackName.includes("stack1");
    },
  });
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  expect(stack1.isActive).toBeTruthy();
  expect(stack2.isActive).toBeFalsy();
});

test("isActive: dev mode", async () => {
  const app = await createApp({
    mode: "dev",
  });
  const stack = new Stack(app, "stack");
  expect(stack.isActive).toBeTruthy();
});

test("isActive: remove mode", async () => {
  const app = await createApp({
    mode: "remove",
  });
  const stack = new Stack(app, "stack");
  expect(stack.isActive).toBeFalsy();
});
