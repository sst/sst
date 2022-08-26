import { test, expect } from "vitest";
import { App, Api, Auth, Stack } from "../src";
import { hasResource } from "./helper";

test("adds route", () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "api", {});
  new Auth(stack, "auth", {
    api,
    function: "test/lambda.handler"
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "ANY /auth/{proxy+}"
  });
});

test("custom prefix", () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "api", {});
  new Auth(stack, "auth", {
    api,
    function: "test/lambda.handler",
    prefix: "/custom"
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "ANY /custom/{proxy+}"
  });
});
