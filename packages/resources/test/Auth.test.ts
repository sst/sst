import { test, expect, describe } from "vitest";
import { App, Api, Auth, Stack } from "../src";
import { hasResource } from "./helper";

describe("auth", () => {
  const stack = new Stack(new App(), "stack");
  const auth = new Auth(stack, "auth", {
    authenticator: "test/lambda.handler",
  });

  test("adds route", () => {
    const stack = new Stack(new App(), "stack");
    const api = new Api(stack, "api", {});
    auth.attach(stack, {
      api,
    });
    hasResource(stack, "AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /auth/{proxy+}",
    });
  });

  test("custom prefix", () => {
    const stack = new Stack(new App(), "stack");
    const api = new Api(stack, "api_custom", {});
    auth.attach(stack, {
      api,
      prefix: "/custom",
    });
    hasResource(stack, "AWS::ApiGatewayV2::Route", {
      RouteKey: "ANY /custom/{proxy+}",
    });
  });
});
