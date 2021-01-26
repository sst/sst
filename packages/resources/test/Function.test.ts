/* eslint-disable @typescript-eslint/no-explicit-any*/

import * as lambda from "@aws-cdk/aws-lambda";
import {
  App,
  Stack,
  Function,
  HandlerProps,
  FunctionHandlerProps,
} from "../src";

test("non-namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as HandlerProps;
  expect(handlerProps).toBeDefined();
});

test("namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as FunctionHandlerProps;
  expect(handlerProps).toBeDefined();
});

test("function-handler-missing", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Function(stack, "Function", { });
  }).toThrow(/No handler defined/);
});

test("function-xray-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const func = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect((func.node?.defaultChild as any).tracingConfig.mode).toMatch("Active");
});

test("function-xray-disabled", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const func = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: lambda.Tracing.DISABLED,
  });
  expect((func.node?.defaultChild as any).tracingConfig).toBeUndefined();
});
