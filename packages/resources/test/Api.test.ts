/* eslint-disable @typescript-eslint/no-explicit-any*/
/* eslint-disable @typescript-eslint/ban-ts-comment*/

import * as lambda from "@aws-cdk/aws-lambda";
import { App, Stack, Api } from "../src";
import { getStackCfResources } from "./helpers";

test("api-name", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi } = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect((httpApi.node?.defaultChild as any).name).toMatch("dev-my-app-Api");
});

test("api-cors-redefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      cors: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApiProps: {},
    });
  }).toThrow(/Cannot define both cors and httpApiProps/);
});

test("api-cors-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi } = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect((httpApi.node?.defaultChild as any).corsConfiguration).toMatchObject({
    allowHeaders: ["*"],
    allowMethods: ["GET", "PUT", "POST", "HEAD", "PATCH", "DELETE", "OPTIONS"],
    allowOrigins: ["*"],
  });
});

test("api-cors-true", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi } = new Api(stack, "Api", {
    cors: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect((httpApi.node?.defaultChild as any).corsConfiguration).toMatchObject({
    allowHeaders: ["*"],
    allowMethods: ["GET", "PUT", "POST", "HEAD", "PATCH", "DELETE", "OPTIONS"],
    allowOrigins: ["*"],
  });
});

test("api-cors-false", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi } = new Api(stack, "Api", {
    cors: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect((httpApi.node?.defaultChild as any).corsConfiguration).toBeUndefined();
});

test("api-access-log-redefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApiProps: {},
    });
  }).toThrow(/Cannot define both accessLog and httpApiProps/);
});

test("api-access-log-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi, accessLogGroup } = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(accessLogGroup?.logGroupArn).toContain("TOKEN");
  expect(
    (httpApi.defaultStage?.node.defaultChild as any).accessLogSettings
  ).toMatchObject({
    format:
      '{"path":"$context.path","status":"$context.status","routeKey":"$context.routeKey","protocol":"$context.protocol","requestId":"$context.requestId","ip":"$context.identity.sourceIp","httpMethod":"$context.httpMethod","requestTime":"$context.requestTime","responseLength":"$context.responseLength","responseLatency":"$context.responseLatency","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
    destinationArn: accessLogGroup?.logGroupArn,
  });
});

test("api-access-log-true", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi, accessLogGroup } = new Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(accessLogGroup?.logGroupArn).toContain("TOKEN");
  expect(
    (httpApi.defaultStage?.node.defaultChild as any).accessLogSettings
  ).toMatchObject({
    format:
      '{"path":"$context.path","status":"$context.status","routeKey":"$context.routeKey","protocol":"$context.protocol","requestId":"$context.requestId","ip":"$context.identity.sourceIp","httpMethod":"$context.httpMethod","requestTime":"$context.requestTime","responseLength":"$context.responseLength","responseLatency":"$context.responseLatency","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
    destinationArn: accessLogGroup?.logGroupArn,
  });
});

test("api-access-log-false", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const { httpApi, accessLogGroup } = new Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(accessLogGroup).toBeUndefined();
  expect(
    (httpApi.defaultStage?.node.defaultChild as any).accessLogSettings
  ).toBeUndefined();
});

test("api-default-authorization-type-invalid", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": "test/lambda.handler",
      },
      defaultAuthorizationType: "ABC",
    });
  }).toThrow(
    /sst.Api does not currently support ABC. Only "AWS_IAM" is currently supported./
  );
});

test("api-default-authorization-type-iam", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: "AWS_IAM",
  });
  const route = Object.values(getStackCfResources(stack)).find(
    (resource: any) => resource.Type === "AWS::ApiGatewayV2::Route"
  ) as any;
  expect(route.Properties.AuthorizationType).toContain("AWS_IAM");
});

test("api-default-authorization-type-none", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: "NONE",
  });
  const route = Object.values(getStackCfResources(stack)).find(
    (resource: any) => resource.Type === "AWS::ApiGatewayV2::Route"
  ) as any;
  expect(route.Properties.AuthorizationType).toContain("NONE");
});

test("api-default-authorization-type-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  const route = Object.values(getStackCfResources(stack)).find(
    (resource: any) => resource.Type === "AWS::ApiGatewayV2::Route"
  ) as any;
  expect(route.Properties.AuthorizationType).toContain("NONE");
});

test("api-default-lambda-props", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultFunctionProps: {
      runtime: lambda.Runtime.NODEJS_8_10,
    },
  });
  const route = Object.values(getStackCfResources(stack)).find(
    (resource: any) => resource.Type === "AWS::Lambda::Function"
  ) as any;
  expect(route.Properties.Runtime).toMatch("nodejs8.10");
});

test("api-routes-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    // @ts-ignore to by pass required 'routes' check
    new Api(stack, "Api", {});
  }).toThrow(/Missing "routes" in sst.Api/);
});

test("api-routes-empty", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {},
    });
  }).toThrow(/At least 1 route is required/);
});

test("api-route-invalid", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET / 1 2 3": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid route GET \/ 1 2 3/);
});

test("api-route-invalid-method", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "ANY /": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid method defined for "ANY \/"/);
});

test("api-route-invalid-path", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET ": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid path defined for "GET "/);
});

test("api-route-authorization-type-invalid", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          functionProps: {
            handler: "test/lambda.handler",
          },
          authorizationType: "ABC",
        },
      },
    });
  }).toThrow(
    /sst.Api does not currently support ABC. Only "AWS_IAM" is currently supported./
  );
});

test("api-route-authorization-type-override-by-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: "AWS_IAM",
    routes: {
      "GET /": {
        functionProps: {
          handler: "test/lambda.handler",
        },
        authorizationType: "NONE",
      },
    },
  });
  const route = Object.values(getStackCfResources(stack)).find(
    (resource: any) => resource.Type === "AWS::ApiGatewayV2::Route"
  ) as any;
  expect(route.Properties.AuthorizationType).toContain("NONE");
});

test("api-route-handler-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          functionProps: {},
        },
      },
    });
  }).toThrow(/No handler defined for "GET \/"/);
});

test("api-route-handler-override-by-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultFunctionProps: {
      runtime: lambda.Runtime.NODEJS_8_10,
    },
    routes: {
      "GET /": {
        functionProps: {
          handler: "test/lambda.handler",
          runtime: lambda.Runtime.NODEJS_10_X,
        },
      },
    },
  });
  const route = Object.values(getStackCfResources(stack)).find(
    (resource: any) => resource.Type === "AWS::Lambda::Function"
  ) as any;
  expect(route.Properties.Runtime).toMatch("nodejs10.x");
});

test("api-get-function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  const lambda = ret.getFunction("GET /");
  expect(lambda).toBeDefined();
});

test("api-get-function-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  const lambda = ret.getFunction("GET /path");
  expect(lambda).toBeUndefined();
});
