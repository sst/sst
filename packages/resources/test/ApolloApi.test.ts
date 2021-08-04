import {
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
} from "@aws-cdk/assert";
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
              Ref:
                "ApiRouteGETHttpIntegration127c4cdd4a253f86dbf8be184a6835d8C23CE3A7",
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
              Ref:
                "ApiRouteGETHttpIntegration127c4cdd4a253f86dbf8be184a6835d8C23CE3A7",
            },
          ],
        ],
      },
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 1, {
      Handler: "lambda.handler",
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
