import { test, expect, vi } from "vitest";
import {
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
  arrayWith,
  printResource,
  ANY,
  ABSENT,
  createApp,
} from "./helper.js";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { Stack } from "../../dist/constructs";
import {
  SsrFunction,
  SsrFunctionProps,
} from "../../dist/constructs/SsrFunction";

const handler = "test/constructs/lambda/fn.handler";
type SsrFunctionTestProps = Omit<
  SsrFunctionProps,
  "handler" | "memorySize" | "timeout"
> & {
  handler?: SsrFunctionProps["handler"];
  memorySize?: SsrFunctionProps["memorySize"];
  timeout?: SsrFunctionProps["timeout"];
};

async function createFn(
  props?: SsrFunctionTestProps | ((stack: Stack) => SsrFunctionTestProps)
) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const fn = new SsrFunction(stack, "Fn", {
    handler,
    timeout: 10,
    memorySize: 1024,
    runtime: "nodejs18.x",
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, fn };
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("default", async () => {
  const { stack, fn } = await createFn();
  expect(fn.role).toBeDefined();
  expect(fn.functionArn).toBeDefined();
  expect(fn.functionName).toBeDefined();
});

test("architecture: undefined", async () => {
  const { stack, fn } = await createFn();
  printResource(stack, "AWS::Lambda::Function");
  hasResource(stack, "AWS::Lambda::Function", {
    Architectures: ["arm64"],
  });
});

test("architecture", async () => {
  const { stack, fn } = await createFn({
    architecture: Architecture.X86_64,
  });
  printResource(stack, "AWS::Lambda::Function");
  hasResource(stack, "AWS::Lambda::Function", {
    Architectures: ["x86_64"],
  });
});
