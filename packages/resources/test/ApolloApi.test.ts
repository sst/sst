import {
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
} from "aws-cdk-lib/assert";
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
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Api", 1));
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /",
      Target: {
        "Fn::Join": [
          "",
          [
            "integrations/",
            {
              Ref: "ApiRouteGETIntegrationGET10DCD122",
            },
          ],
        ],
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /",
      Target: {
        "Fn::Join": [
          "",
          [
            "integrations/",
            {
              Ref: "ApiRouteGETIntegrationGET10DCD122",
            },
          ],
        ],
      },
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 1, {
      Handler: "test/lambda.handler",
    })
  );
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

test("rootPath", async () => {
  const stack = new Stack(new App(), "stack");
  const rootPath = "/api";
  const api = new ApolloApi(stack, "Api", {
    server: "test/lambda.handler",
    rootPath,
  } as ApolloApiProps);
  expect(api.serverFunction).toBeDefined();
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /api",
    })
  );
});

///////////////////
// Test Properties
///////////////////

test("serverFunction", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApolloApi(stack, "Api", {
    server: "test/lambda.handler",
  });
  expect(api.serverFunction).toBeDefined();
});
