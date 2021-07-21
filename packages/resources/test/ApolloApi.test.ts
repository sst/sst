import "@aws-cdk/assert/jest";
import { App, Stack, ApolloApi, ApolloApiProps } from "../src";

test("server-undefined-error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApolloApi(stack, "Api", {} as ApolloApiProps);
  }).toThrow(/Missing "server"/);
});

test("server-string", async () => {
  const stack = new Stack(new App(), "stack");
  new ApolloApi(stack, "Api", {
    server: "test/lambda.handler",
  });
  expect(stack).toCountResources("AWS::ApiGatewayV2::Api", 1);
  expect(stack).toCountResources("AWS::ApiGatewayV2::Route", 1);
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
    RouteKey: "ANY /",
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("routes", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApolloApi(stack, "Api", {
      server: "test/lambda.handler",
      routes: {
        "GET /": "test/lambda.handler",
      },
    } as ApolloApiProps);
  }).toThrow(/Please use the "server" option/);
});
