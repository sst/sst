import { test, expect, vi } from "vitest";
import {
  ABSENT,
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
} from "./helper";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as logs from "aws-cdk-lib/aws-logs";
import { App, Stack, WebSocketApi, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

const manageConnectionsPolicy = {
  Action: "execute-api:ManageConnections",
  Effect: "Allow",
  Resource: {
    "Fn::Join": [
      "",
      [
        "arn:",
        { Ref: "AWS::Partition" },
        ":execute-api:us-east-1:my-account:",
        { Ref: "ApiCD79AAA0" },
        "/dev/POST/*",
      ],
    ],
  },
};

function importWebSocketApiFromAnotherStack(stack: Stack) {
  const app = stack.node.root as App;
  const misc = new Stack(app, "misc");
  return new WebSocketApi(misc, "Api");
}

///////////////////
// Test Constructor
///////////////////

test("constructor: webSocketApi is undefined", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const api = new WebSocketApi(stack, "Api", {});
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-websocket-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    StageName: "dev",
    AutoDeploy: true,
  });
});

test("constructor: webSocketApi is props", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    cdk: {
      webSocketApi: {
        description: "New WebSocket API",
      },
      webSocketStage: {
        autoDeploy: false,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-websocket-Api",
    Description: "New WebSocket API",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    StageName: "dev",
    AutoDeploy: false,
  });
});

test("constructor: webSocketApi is construct", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  new WebSocketApi(stack, "Api", {
    cdk: {
      webSocketApi: iApi.cdk.webSocketApi,
      webSocketStage: iApi.cdk.webSocketStage,
    },
  });
  countResources(stack, "AWS::ApiGatewayV2::Api", 0);
  countResources(stack, "AWS::ApiGatewayV2::Stage", 0);
});

test("constructor: webSocketApi stage-imported-api-no-imported", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  expect(() => {
    new WebSocketApi(stack, "Api", {
      cdk: {
        webSocketStage: iApi.cdk.webSocketStage,
      },
    });
  }).toThrow(
    /Cannot import the "webSocketStage" when the "webSocketApi" is not imported./
  );
});

test("accessLog-undefined", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: true,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","eventType":"$context.eventType","routeKey":"$context.routeKey","status":$context.status,"integrationRequestId":"$context.awsEndpointRequestId","integrationStatus":"$context.integrationStatus","integrationLatency":"$context.integrationLatency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId","connectedAt":"$context.connectedAt","connectionId":"$context.connectionId"}',
    },
  });
});

test("accessLog-true", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: true,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","eventType":"$context.eventType","routeKey":"$context.routeKey","status":$context.status,"integrationRequestId":"$context.awsEndpointRequestId","integrationStatus":"$context.integrationStatus","integrationLatency":"$context.integrationLatency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId","connectedAt":"$context.connectedAt","connectionId":"$context.connectionId"}',
    },
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    RetentionInDays: ABSENT,
  });
});

test("accessLog-false", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: false,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: ABSENT,
  });
});

test("accessLog-string", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: "$context.requestTime",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format: "$context.requestTime",
    },
  });
});

test("accessLog-props-with-format", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: {
      format: "$context.requestTime",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format: "$context.requestTime",
    },
  });
});

test("accessLog-props-with-retention", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: {
      format: "$context.requestTime",
      retention: "one_week",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: objectLike({
      Format: "$context.requestTime",
    }),
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    RetentionInDays: logs.RetentionDays.ONE_WEEK,
  });
});

test("accessLog-props-with-retention-invalid", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  expect(() => {
    new WebSocketApi(stack, "Api", {
      accessLog: {
        // @ts-ignore Allow non-existant value
        retention: "NOT_EXIST",
      },
    });
  }).toThrow(/Invalid access log retention value "NOT_EXIST"./);
});

test("accessLog-redefined", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  expect(() => {
    new WebSocketApi(stack, "Api", {
      cdk: {
        webSocketApi: iApi.cdk.webSocketApi,
        webSocketStage: iApi.cdk.webSocketStage,
      },
      accessLog: true,
    });
  }).toThrow(
    /Cannot configure the "accessLog" when "webSocketStage" is a construct/
  );
});

test("customDomain is string", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new WebSocketApi(stack, "Api", {
    customDomain: "api.domain.com",
  });
  expect(api.customDomainUrl).toMatch(/wss:\/\/api.domain.com/);
  expect(api.cdk.domainName).toBeDefined();
  expect(api.cdk.certificate).toBeDefined();
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-websocket-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: "api.domain.com",
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "ApiCertificate285C31EB" },
        EndpointType: "REGIONAL",
      },
    ],
  });
  hasResource(stack, "AWS::ApiGatewayV2::ApiMapping", {
    DomainName: { Ref: "ApiDomainNameAC93F744" },
    Stage: "dev",
  });
  hasResource(stack, "AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
    DomainValidationOptions: [
      {
        DomainName: "api.domain.com",
        HostedZoneId: { Ref: "ApiHostedZone826B96E5" },
      },
    ],
    ValidationMethod: "DNS",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
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
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "AAAA",
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
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain.domainName is string", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new WebSocketApi(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
      path: "users",
    },
  });
  expect(api.customDomainUrl).toMatch(/wss:\/\/api.domain.com\/users\//);
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-websocket-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: "api.domain.com",
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "ApiCertificate285C31EB" },
        EndpointType: "REGIONAL",
      },
    ],
  });
  hasResource(stack, "AWS::ApiGatewayV2::ApiMapping", {
    DomainName: { Ref: "ApiDomainNameAC93F744" },
    Stage: "dev",
    ApiMappingKey: "users",
  });
  hasResource(stack, "AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "api.domain.com.",
  });
});

test("customDomain.domainName is string (uppercase error)", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  expect(() => {
    new WebSocketApi(stack, "Api", {
      customDomain: {
        domainName: "API.domain.com",
      },
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain is props: hostedZone-generated-from-minimal-domainName", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new WebSocketApi(stack, "Api", {
    customDomain: "api.domain.com",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain is props: hostedZone-generated-from-full-domainName", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new WebSocketApi(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
    },
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: cdk.domainName is apigDomainName", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  apig.DomainName.fromDomainNameAttributes = vi
    .fn()
    .mockImplementation((scope, id) => {
      return new apig.DomainName(scope, id, {
        certificate: new acm.Certificate(scope, "Cert", {
          domainName: "api.domain.com",
        }),
        domainName: "api.domain.com",
      });
    });

  new WebSocketApi(stack, "Api", {
    customDomain: {
      path: "users",
      cdk: {
        domainName: apig.DomainName.fromDomainNameAttributes(
          stack,
          "DomainName",
          {
            name: "name",
            regionalDomainName: "api.domain.com",
            regionalHostedZoneId: "id",
          }
        ) as apig.DomainName,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-websocket-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: "api.domain.com",
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "Cert5C9FAEC1" },
        EndpointType: "REGIONAL",
      },
    ],
  });
  hasResource(stack, "AWS::ApiGatewayV2::ApiMapping", {
    DomainName: { Ref: "DomainNameEC95A6E9" },
    Stage: "dev",
    ApiMappingKey: "users",
  });
  countResources(stack, "AWS::CertificateManager::Certificate", 1);
  countResources(stack, "AWS::Route53::RecordSet", 0);
  countResources(stack, "AWS::Route53::HostedZone", 0);
});

test("customDomain: cdk.domainName and hostedZone co-exist error", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  apig.DomainName.fromDomainNameAttributes = vi
    .fn()
    .mockImplementation((scope, id) => {
      return new apig.DomainName(scope, id, {
        certificate: new acm.Certificate(scope, "Cert", {
          domainName: "api.domain.com",
        }),
        domainName: "api.domain.com",
      });
    });

  expect(() => {
    new WebSocketApi(stack, "Api", {
      customDomain: {
        cdk: {
          domainName: apig.DomainName.fromDomainNameAttributes(
            stack,
            "DomainName",
            {
              name: "name",
              regionalDomainName: "api.domain.com",
              regionalHostedZoneId: "id",
            }
          ) as apig.DomainName,
        },
        hostedZone: "domain.com",
      },
    });
  }).toThrow(
    /Cannot configure the "hostedZone" when the "domainName" is a construct/
  );
});

test("customDomain: cdk.domainName and cdk.certificate co-exist error", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  apig.DomainName.fromDomainNameAttributes = vi
    .fn()
    .mockImplementation((scope, id) => {
      return new apig.DomainName(scope, id, {
        certificate: new acm.Certificate(scope, "DomainCert", {
          domainName: "api.domain.com",
        }),
        domainName: "api.domain.com",
      });
    });

  expect(() => {
    new WebSocketApi(stack, "Api", {
      customDomain: {
        cdk: {
          domainName: apig.DomainName.fromDomainNameAttributes(
            stack,
            "DomainName",
            {
              name: "name",
              regionalDomainName: "api.domain.com",
              regionalHostedZoneId: "id",
            }
          ) as apig.DomainName,
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "api.domain.com",
          }),
        },
      },
    });
  }).toThrow(
    /Cannot configure the "certificate" when the "domainName" is a construct/
  );
});

test("customDomain: isExternalDomain true", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const site = new WebSocketApi(stack, "Site", {
    customDomain: {
      domainName: "www.domain.com",
      isExternalDomain: true,
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
  });
  expect(site.customDomainUrl).toEqual("wss://www.domain.com");
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-websocket-Site",
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: "www.domain.com",
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "Cert5C9FAEC1" },
        EndpointType: "REGIONAL",
      },
    ],
  });
});

test("customDomain: isExternalDomain true and no certificate", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  expect(() => {
    new WebSocketApi(stack, "Site", {
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  expect(() => {
    new WebSocketApi(stack, "Site", {
      customDomain: {
        domainName: "www.domain.com",
        hostedZone: "domain.com",
        isExternalDomain: true,
        cdk: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
    });
  }).toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("customDomain is props: stage-is-imported-error", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  expect(() => {
    new WebSocketApi(stack, "Api", {
      customDomain: "api.domain.com",
      cdk: {
        webSocketApi: iApi.cdk.webSocketApi,
        webSocketStage: iApi.cdk.webSocketStage,
      },
    });
  }).toThrow(
    /Cannot configure the "customDomain" when "webSocketStage" is a construct/
  );
});

test("customDomain is props: domainName-defined-in-stage", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const domainName = apig.DomainName.fromDomainNameAttributes(
    stack,
    "IDomainName",
    {
      name: "",
      regionalDomainName: "",
      regionalHostedZoneId: "",
    }
  );
  expect(() => {
    new WebSocketApi(stack, "Api", {
      cdk: {
        webSocketStage: {
          domainMapping: { domainName },
        },
      },
    });
  }).toThrow(
    /Do not configure the "webSocketStage.domainMapping". Use the "customDomain" to configure the Api domain./
  );
});

test("authorizationType-iam", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizer: "iam",
  });
  countResources(stack, "AWS::ApiGatewayV2::Route", 2);
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 1, {
    AuthorizationType: "AWS_IAM",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "$connect",
    AuthorizationType: "AWS_IAM",
  });
});

test("authorizationType-none", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizer: "none",
  });
  countResources(stack, "AWS::ApiGatewayV2::Route", 2);
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 2, {
    AuthorizationType: "NONE",
  });
});

test("authorizationType-default", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::ApiGatewayV2::Route", 2);
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 2, {
    AuthorizationType: "NONE",
  });
});

test("authorizationType-custom", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const handler = new Function(stack, "Authorizer", {
    handler: "test/lambda.handler",
  });
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizer: {
      type: "lambda",
      function: handler,
      name: "LambdaAuthorizer",
    },
  });
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 1, {
    AuthorizationType: "NONE",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "$default",
    AuthorizationType: "NONE",
  });
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 1, {
    AuthorizationType: "CUSTOM",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "$connect",
    AuthorizationType: "CUSTOM",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "LambdaAuthorizer",
    AuthorizerType: "REQUEST",
    AuthorizerPayloadFormatVersion: ABSENT,
    AuthorizerResultTtlInSeconds: ABSENT,
    IdentitySource: ["route.request.header.Authorization"],
  });
});

test("authorizationType-custom: override identitySource", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const handler = new Function(stack, "Authorizer", {
    handler: "test/lambda.handler",
  });
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizer: {
      type: "lambda",
      function: handler,
      name: "LambdaAuthorizer",
      identitySource: ["route.request.querystring.Auth"],
    },
  });
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 1, {
    AuthorizationType: "NONE",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "$default",
    AuthorizationType: "NONE",
  });
  countResourcesLike(stack, "AWS::ApiGatewayV2::Route", 1, {
    AuthorizationType: "CUSTOM",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "$connect",
    AuthorizationType: "CUSTOM",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "LambdaAuthorizer",
    AuthorizerType: "REQUEST",
    AuthorizerPayloadFormatVersion: ABSENT,
    AuthorizerResultTtlInSeconds: ABSENT,
    IdentitySource: ["route.request.querystring.Auth"],
  });
});

test("routes: undefined", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api");
  countResources(stack, "AWS::ApiGatewayV2::Api", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 0);
});

test("routes: empty", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {},
  });
  countResources(stack, "AWS::ApiGatewayV2::Api", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 0);
});

test("routes: route is string", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
      $default: "test/lambda.handler",
      custom: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::ApiGatewayV2::Route", 4);
  countResourcesLike(stack, "AWS::Lambda::Function", 4, {
    Handler: "test/lambda.handler",
  });
});

test("routes: route is string-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
    defaults: {
      function: {
        timeout: 3,
        environment: {
          keyA: "valueA",
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
    Environment: {
      Variables: {
        keyA: "valueA",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("routes: route is Function", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: f,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: route is Function-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new WebSocketApi(stack, "Api", {
      routes: {
        $connect: f,
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("routes: route is prop", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        function: {
          handler: "test/lambda.handler",
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: route is prop-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        function: {
          handler: "test/lambda.handler",
        },
      },
    },
    defaults: {
      function: {
        timeout: 3,
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("routes: route is prop-with-defaultFunctionProps-override", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        function: {
          handler: "test/lambda.handler",
          timeout: 5,
          environment: {
            keyA: "valueA",
          },
        },
      },
    },
    defaults: {
      function: {
        timeout: 3,
        environment: {
          keyB: "valueB",
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 5,
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("routes: route is prop-with-defaultFunctionProps-override-with-app-defaultFunctionProps", async () => {
  const app = new App({ name: "websocket" });
  app.setDefaultFunctionProps({
    timeout: 15,
    environment: { keyC: "valueC" },
  });

  const stack = new Stack(app, "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        function: {
          handler: "test/lambda.handler",
          timeout: 5,
          environment: {
            keyA: "valueA",
          },
        },
      },
    },
    defaults: {
      function: {
        timeout: 3,
        environment: {
          keyB: "valueB",
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",

    Timeout: 5,
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        keyC: "valueC",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

///////////////////
// Test Properties
///////////////////

test("routes: no routes", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const api = new WebSocketApi(stack, "Api", {});
  expect(api.routes).toEqual([]);
});

test("routes: has routes", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      custom: "test/lambda.handler",
    },
  });
  expect(api.routes).toEqual(["$connect", "custom"]);
});

///////////////////
// Test Methods
///////////////////

test("getFunction", async () => {
  const app = new App({ name: "websocket" });
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
  });
  expect(ret.getFunction("$connect")).toBeDefined();
});

test("getFunction: route key with trailing spaces", async () => {
  const app = new App({ name: "websocket" });
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      "$connect ": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("$connect")).toBeDefined();
  expect(ret.getFunction("$connect ")).toBeDefined();
});

test("getFunction: route key not exist", async () => {
  const app = new App({ name: "websocket" });
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
  });
  expect(ret.getFunction("$disconnect")).toBeUndefined();
});

test("getRoute", async () => {
  const app = new App({ name: "websocket" });
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
  });
  expect(ret.getRoute("$connect")).toBeDefined();
  expect(ret.getRoute("$connect ")).toBeDefined();
  expect(ret.getRoute("$disconnect")).toBeUndefined();
});

test("addRoutes-existing-route", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      custom: "test/lambda.handler",
    },
  });
  expect(() => {
    api.addRoutes(stack, {
      custom: "test/lambda.handler",
    });
  }).toThrow(/A route already exists for "custom"/);
});

test("attachPermissions", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        manageConnectionsPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        manageConnectionsPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissionsToRoute", async () => {
  const stack = new Stack(new App({ name: "websocket" }), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
    },
  });
  api.attachPermissionsToRoute("$connect", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        manageConnectionsPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy, manageConnectionsPolicy],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions-after-addRoutes", async () => {
  const app = new App({ name: "websocket" });
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new WebSocketApi(stackA, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  api.addRoutes(stackB, {
    custom: "test/lambda.handler",
  });
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        manageConnectionsPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        manageConnectionsPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "execute-api:ManageConnections",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                { Ref: "AWS::Partition" },
                ":execute-api:us-east-1:my-account:",
                {
                  "Fn::ImportValue":
                    "dev-websocket-stackA:ExportsOutputRefApiCD79AAA0A1504A18",
                },
                "/dev/POST/*",
              ],
            ],
          },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});
