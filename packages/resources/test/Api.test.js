const lambda = require("@aws-cdk/aws-lambda");
const sst = require("../src");

test("api-cors-redefined", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      cors: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApiProps: {},
    })
  }).toThrow(/Cannot define both cors and httpApiProps/);
});

test("api-cors-default", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const { httpApi } = new sst.Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(httpApi.node.defaultChild.corsConfiguration).toMatchObject({
    "allowHeaders": [ "*" ],
    "allowMethods": [ "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT" ],
    "allowOrigins": [ "*" ],
  });
});

test("api-cors-true", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const { httpApi } = new sst.Api(stack, "Api", {
    cors: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(httpApi.node.defaultChild.corsConfiguration).toMatchObject({
    "allowHeaders": [ "*" ],
    "allowMethods": [ "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT" ],
    "allowOrigins": [ "*" ],
  });
});

test("api-cors-false", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const { httpApi } = new sst.Api(stack, "Api", {
    cors: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(httpApi.node.defaultChild.corsConfiguration).toBeUndefined();
});

test("api-access-log-redefined", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApiProps: {},
    })
  }).toThrow(/Cannot define both accessLog and httpApiProps/);
});

test("api-access-log-default", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const { httpApi, accessLogGroup } = new sst.Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(accessLogGroup.logGroupArn).toContain('TOKEN');
  expect(httpApi.defaultStage.node.defaultChild.accessLogSettings).toMatchObject({
    "format": "{\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"requestTime\":\"$context.requestTime\",\"httpMethod\":\"$context.httpMethod\",\"routeKey\":\"$context.routeKey\",\"path\":\"$context.path\",\"status\":\"$context.status\",\"protocol\":\"$context.protocol\",\"cognitoIdentityId\":\"$context.identity.cognitoIdentityId\",\"responseLatency\":\"$context.responseLatency\",\"responseLength\":\"$context.responseLength\"}",
    "destinationArn": accessLogGroup.logGroupArn,
  });
});

test("api-access-log-true", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const { httpApi, accessLogGroup } = new sst.Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(accessLogGroup.logGroupArn).toContain('TOKEN');
  expect(httpApi.defaultStage.node.defaultChild.accessLogSettings).toMatchObject({
    "format": "{\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"requestTime\":\"$context.requestTime\",\"httpMethod\":\"$context.httpMethod\",\"routeKey\":\"$context.routeKey\",\"path\":\"$context.path\",\"status\":\"$context.status\",\"protocol\":\"$context.protocol\",\"cognitoIdentityId\":\"$context.identity.cognitoIdentityId\",\"responseLatency\":\"$context.responseLatency\",\"responseLength\":\"$context.responseLength\"}",
    "destinationArn": accessLogGroup.logGroupArn,
  });
});

test("api-access-log-false", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  const { httpApi, accessLogGroup } = new sst.Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(accessLogGroup).toBeUndefined();
  expect(httpApi.defaultStage.node.defaultChild.accessLogSettings).toBeUndefined();
});

test("api-default-authorization-type-invalid", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
        "GET /": "test/lambda.handler",
      },
      defaultAuthorizationType: 'ABC',
    })
  }).toThrow(/sst.Api does not support ABC authorization type. Only 'NONE' and 'AWS_IAM' types are currently supported./);
});

test("api-default-authorization-type-iam", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  new sst.Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: 'AWS_IAM',
  });
  const route = Object.values(stack._toCloudFormation().Resources).find(resource =>
    resource.Type === 'AWS::ApiGatewayV2::Route'
  );
  expect(route.Properties.AuthorizationType).toContain('AWS_IAM');
});

test("api-default-authorization-type-none", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  new sst.Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: 'NONE',
  });
  const route = Object.values(stack._toCloudFormation().Resources).find(resource =>
    resource.Type === 'AWS::ApiGatewayV2::Route'
  );
  expect(route.Properties.AuthorizationType).toContain('NONE');
});

test("api-default-authorization-type-default", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  new sst.Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  const route = Object.values(stack._toCloudFormation().Resources).find(resource =>
    resource.Type === 'AWS::ApiGatewayV2::Route'
  );
  expect(route.Properties.AuthorizationType).toContain('NONE');
});

test("api-default-lambda-props", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  new sst.Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultLambdaProps: {
      runtime: lambda.Runtime.NODEJS_8_10,
    },
  });
  const route = Object.values(stack._toCloudFormation().Resources).find(resource =>
    resource.Type === 'AWS::Lambda::Function'
  );
  expect(route.Properties.Runtime).toMatch('nodejs8.10');
});

test("api-routes-undefined", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
    })
  }).toThrow(/Missing 'routes' in sst.Api./);
});

test("api-routes-empty", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
      },
    })
  }).toThrow(/At least 1 route is required./);
});

test("api-route-invalid", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
        "GET / 1 2 3": "test/lambda.handler",
      },
    })
  }).toThrow(/Invalid route GET \/ 1 2 3/);
});

test("api-route-invalid-method", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
        "ANY /": "test/lambda.handler",
      },
    })
  }).toThrow(/Invalid method defined for route ANY \//);
});

test("api-route-invalid-path", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
        "GET ": "test/lambda.handler",
      },
    })
  }).toThrow(/Invalid path defined for route GET /);
});

test("api-route-authorization-type-invalid", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
        "GET /": {
          lambdaProps: {
            handler: "test/lambda.handler",
          },
          authorizationType: 'ABC',
        },
      },
    })
  }).toThrow(/sst.Api does not support ABC authorization type. Only 'NONE' and 'AWS_IAM' types are currently supported./);
});

test("api-route-authorization-type-override-by-default", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  new sst.Api(stack, "Api", {
    defaultAuthorizationType: 'AWS_IAM',
    routes: {
      "GET /": {
        lambdaProps: {
          handler: "test/lambda.handler",
        },
        authorizationType: 'NONE',
      },
    },
  })
  const route = Object.values(stack._toCloudFormation().Resources).find(resource =>
    resource.Type === 'AWS::ApiGatewayV2::Route'
  );
  expect(route.Properties.AuthorizationType).toContain('NONE');
});

test("api-route-handler-undefined", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  expect(() => {
    new sst.Api(stack, "Api", {
      routes: {
        "GET /": {
          lambdaProps: { }
        },
      },
    })
  }).toThrow(/No Lambda handler defined for route GET \//);
});

test("api-route-handler-override-by-default", async () => {
  const app = new sst.App();
  const stack = new sst.Stack(app, "stack");
  new sst.Api(stack, "Api", {
    defaultLambdaProps: {
      runtime: lambda.Runtime.NODEJS_8_10,
    },
    routes: {
      "GET /": {
        lambdaProps: {
          handler: "test/lambda.handler",
          runtime: lambda.Runtime.NODEJS_10_X,
        },
      },
    },
  })
  const route = Object.values(stack._toCloudFormation().Resources).find(resource =>
    resource.Type === 'AWS::Lambda::Function'
  );
  expect(route.Properties.Runtime).toMatch('nodejs10.x');
});

