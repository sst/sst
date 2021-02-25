import "@aws-cdk/assert/jest";
import { ABSENT } from "@aws-cdk/assert";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as route53 from "@aws-cdk/aws-route53";
import { App, Stack, Api, ApiProps, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

test("usecase-base", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
    CorsConfiguration: {
      AllowHeaders: ["*"],
      AllowMethods: [
        "GET",
        "PUT",
        "POST",
        "HEAD",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],
      AllowOrigins: ["*"],
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","routeKey":"$context.routeKey","status":"$context.status","responseLatency":"$context.responseLatency","integrationRequestId":"$context.integration.requestId","integrationStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
    },
  });
});

test("usecase-domain-minimal", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new Api(stack, "Api", {
    customDomain: "api.domain.com",
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::DomainName", {
    DomainName: "api.domain.com",
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "ApiCertificate285C31EB" },
        EndpointType: "REGIONAL",
      },
    ],
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::ApiMapping", {
    DomainName: "api.domain.com",
    Stage: "$default",
  });
  expect(stack).toHaveResource("AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
    DomainValidationOptions: [
      {
        DomainName: "api.domain.com",
        HostedZoneId: { Ref: "ApiHostedZone826B96E5" },
      },
    ],
    ValidationMethod: "DNS",
  });
  expect(stack).toHaveResource("AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "A",
    AliasTarget: {
      DNSName: {
        "Fn::GetAtt": ["ApiDomainNameAC93F744", "RegionalDomainName"],
      },
      HostedZoneId: {
        "Fn::GetAtt": ["ApiDomainNameAC93F744", "RegionalHostedZoneId"],
      },
    },
    HostedZoneId: { Ref: "ApiHostedZone826B96E5" },
  });
  expect(stack).toHaveResource("AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("usecase-domain-full", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
      path: "users",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::DomainName", {
    DomainName: "api.domain.com",
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "ApiCertificate285C31EB" },
        EndpointType: "REGIONAL",
      },
    ],
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::ApiMapping", {
    DomainName: "api.domain.com",
    Stage: "$default",
    ApiMappingKey: "users",
  });
  expect(stack).toHaveResource("AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
  });
  expect(stack).toHaveResource("AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "A",
  });
  expect(stack).toHaveResource("AWS::Route53::HostedZone", {
    Name: "api.domain.com.",
  });
});

test("cors-redefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      cors: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApi: new apig.HttpApi(stack, "HttpApi"),
    });
  }).toThrow(/Cannot define both cors and httpApi/);
});

test("cors-true", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    cors: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Api", {
    CorsConfiguration: {
      AllowHeaders: ["*"],
      AllowMethods: [
        "GET",
        "PUT",
        "POST",
        "HEAD",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],
      AllowOrigins: ["*"],
    },
  });
});

test("cors-false", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    cors: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Api", {
    CorsConfiguration: ABSENT,
  });
});

test("access-log-redefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApi: new apig.HttpApi(stack, "HttpApi"),
    });
  }).toThrow(/Cannot define both accessLog and httpApi/);
});

test("access-log-true", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","routeKey":"$context.routeKey","status":"$context.status","responseLatency":"$context.responseLatency","integrationRequestId":"$context.integration.requestId","integrationStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
    },
  });
});

test("access-log-false", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: ABSENT,
  });
});

test("domain-hostedZone-generated-from-minimal-domainName", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new Api(stack, "Api", {
    customDomain: "api.domain.com",
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("domain-hostedZone-generated-from-full-domainName", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("domain-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApi: new apig.HttpApi(stack, "HttpApi"),
    });
  }).toThrow(/Cannot define both customDomain and httpApi/);
});

test("domain-hostedZone-not-exist", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest.fn().mockImplementation(() => undefined);

  expect(() => {
    new Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
    });
  }).toThrow(/Cannot find hosted zone "domain.com" in Route 53/);
});

test("default-authorization-type-invalid", async () => {
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

test("default-authorization-type-iam", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: "AWS_IAM",
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
    AuthorizationType: "AWS_IAM",
  });
});

test("default-authorization-type-none", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: "NONE",
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("default-authorization-type-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("default-function-props", async () => {
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
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Runtime: "nodejs8.10",
  });
});

test("routes-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {} as ApiProps);
  }).toThrow(/Missing "routes" in sst.Api/);
});

test("routes-empty", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {},
    });
  }).toThrow(/At least 1 route is required/);
});

test("route-invalid", async () => {
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

test("route-invalid-method", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GARBAGE /": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid method defined for "GARBAGE \/"/);
});

test("route-invalid-path", async () => {
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

test("route-authorization-type-invalid", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          function: {
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

test("route-authorization-type-override-by-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: "AWS_IAM",
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
        },
        authorizationType: "NONE",
      },
    },
  });
  expect(stack).toHaveResource("AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("route-value-string", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("route-value-string-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 3,
  });
});

test("route-value-Function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Api(stack, "Api", {
    routes: {
      "GET /": f,
    },
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("route-value-Function-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": f,
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/Cannot define defaultFunctionProps/);
});

test("route-value-FunctionProps-empty", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          function: {},
        },
      },
    });
  }).toThrow(/Invalid function definition/);
});

test("route-value-FunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        handler: "test/lambda.handler",
      },
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("route-value-FunctionProps-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        handler: "test/lambda.handler",
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 3,
  });
});

test("route-value-FunctionProps-with-defaultFunctionProps-override", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        handler: "test/lambda.handler",
        timeout: 5,
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 5,
  });
});

test("route-value-ApiRouteProps-function-string", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
      },
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("route-value-ApiRouteProps-function-string-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 3,
  });
});

test("route-value-ApiRouteProps-function-Function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Api(stack, "Api", {
    routes: {
      "GET /": { function: f },
    },
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("route-value-ApiRouteProps-function-Function-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": { function: f },
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/Cannot define defaultFunctionProps/);
});

test("route-value-ApiRouteProps-function-FunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
        },
      },
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("route-value-ApiRouteProps-function-FunctionProps-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
        },
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 3,
  });
});

test("route-value-ApiRouteProps-function-FunctionProps-with-defaultFunctionProps-override", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
          timeout: 5,
        },
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 5,
  });
});

test("get-function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /")).toBeDefined();
});

test("get-function-multi-spaces", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET  /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /")).toBeDefined();
  expect(ret.getFunction("GET  /")).toBeDefined();
});

test("get-function-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /path")).toBeUndefined();
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
  });
});

test("attachPermissionsToRoute", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  api.attachPermissionsToRoute("GET /", ["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
  });
});
