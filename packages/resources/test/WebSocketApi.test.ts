import {
  ABSENT,
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
  objectLike,
} from "aws-cdk-lib/assert";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as logs from "aws-cdk-lib/aws-logs";
import {
  App,
  Stack,
  WebSocketApi,
  WebSocketApiAuthorizationType,
  Function,
} from "../src";

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
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {});
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      StageName: "dev",
      AutoDeploy: true,
    })
  );
});

test("constructor: webSocketApi is props", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    webSocketApi: {
      description: "New WebSocket API",
    },
    webSocketStage: {
      autoDeploy: false,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
      Description: "New WebSocket API",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      StageName: "dev",
      AutoDeploy: false,
    })
  );
});

test("constructor: webSocketApi is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  new WebSocketApi(stack, "Api", {
    webSocketApi: iApi.webSocketApi,
    webSocketStage: iApi.webSocketStage,
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Api", 0));
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Stage", 0));
});

test("constructor: webSocketApi stage-imported-api-no-imported", async () => {
  const stack = new Stack(new App(), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  expect(() => {
    new WebSocketApi(stack, "Api", {
      webSocketStage: iApi.webSocketStage,
    });
  }).toThrow(
    /Cannot import the "webSocketStage" when the "webSocketApi" is not imported./
  );
});

test("accessLog-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: true,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format:
          '{"requestTime":"$context.requestTime","requestId":"$context.requestId","eventType":"$context.eventType","routeKey":"$context.routeKey","status":$context.status,"integrationRequestId":"$context.awsEndpointRequestId","integrationStatus":"$context.integrationStatus","integrationLatency":"$context.integrationLatency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId","connectedAt":"$context.connectedAt","connectionId":"$context.connectionId"}',
      },
    })
  );
});

test("accessLog-true", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: true,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format:
          '{"requestTime":"$context.requestTime","requestId":"$context.requestId","eventType":"$context.eventType","routeKey":"$context.routeKey","status":$context.status,"integrationRequestId":"$context.awsEndpointRequestId","integrationStatus":"$context.integrationStatus","integrationLatency":"$context.integrationLatency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId","connectedAt":"$context.connectedAt","connectionId":"$context.connectionId"}',
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Logs::LogGroup", {
      RetentionInDays: ABSENT,
    })
  );
});

test("accessLog-false", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: false,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: ABSENT,
    })
  );
});

test("accessLog-string", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: "$context.requestTime",
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format: "$context.requestTime",
      },
    })
  );
});

test("accessLog-props-with-format", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: {
      format: "$context.requestTime",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format: "$context.requestTime",
      },
    })
  );
});

test("accessLog-props-with-retention", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    accessLog: {
      format: "$context.requestTime",
      retention: "ONE_WEEK",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: objectLike({
        Format: "$context.requestTime",
      }),
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Logs::LogGroup", {
      RetentionInDays: logs.RetentionDays.ONE_WEEK,
    })
  );
});

test("accessLog-props-with-retention-invalid", async () => {
  const stack = new Stack(new App(), "stack");
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
  const stack = new Stack(new App(), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  expect(() => {
    new WebSocketApi(stack, "Api", {
      webSocketApi: iApi.webSocketApi,
      webSocketStage: iApi.webSocketStage,
      accessLog: true,
    });
  }).toThrow(
    /Cannot configure the "accessLog" when "webSocketStage" is a construct/
  );
});

test("customDomain-string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new WebSocketApi(stack, "Api", {
    customDomain: "api.domain.com",
  });
  expect(api.customDomainUrl).toMatch(/wss:\/\/api.domain.com/);
  expect(api.apiGatewayDomain).toBeDefined();
  expect(api.acmCertificate).toBeDefined();
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::DomainName", {
      DomainName: "api.domain.com",
      DomainNameConfigurations: [
        {
          CertificateArn: { Ref: "ApiCertificate285C31EB" },
          EndpointType: "REGIONAL",
        },
      ],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::ApiMapping", {
      DomainName: { Ref: "ApiDomainNameAC93F744" },
      Stage: "dev",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::CertificateManager::Certificate", {
      DomainName: "api.domain.com",
      DomainValidationOptions: [
        {
          DomainName: "api.domain.com",
          HostedZoneId: { Ref: "ApiHostedZone826B96E5" },
        },
      ],
      ValidationMethod: "DNS",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
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
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain-props-domainName-string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
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
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::DomainName", {
      DomainName: "api.domain.com",
      DomainNameConfigurations: [
        {
          CertificateArn: { Ref: "ApiCertificate285C31EB" },
          EndpointType: "REGIONAL",
        },
      ],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::ApiMapping", {
      DomainName: { Ref: "ApiDomainNameAC93F744" },
      Stage: "dev",
      ApiMappingKey: "users",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::CertificateManager::Certificate", {
      DomainName: "api.domain.com",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: "api.domain.com.",
      Type: "A",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "api.domain.com.",
    })
  );
});

test("customDomain-props-hostedZone-generated-from-minimal-domainName", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new WebSocketApi(stack, "Api", {
    customDomain: "api.domain.com",
  });
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain-props-hostedZone-generated-from-full-domainName", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new WebSocketApi(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain-props-domainName-apigDomainName", async () => {
  const stack = new Stack(new App(), "stack");
  apig.DomainName.fromDomainNameAttributes = jest
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
      domainName: apig.DomainName.fromDomainNameAttributes(
        stack,
        "DomainName",
        {
          name: "name",
          regionalDomainName: "api.domain.com",
          regionalHostedZoneId: "id",
        }
      ) as apig.DomainName,
      path: "users",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::DomainName", {
      DomainName: "api.domain.com",
      DomainNameConfigurations: [
        {
          CertificateArn: { Ref: "Cert5C9FAEC1" },
          EndpointType: "REGIONAL",
        },
      ],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::ApiMapping", {
      DomainName: { Ref: "DomainNameEC95A6E9" },
      Stage: "dev",
      ApiMappingKey: "users",
    })
  );
  expectCdk(stack).to(
    countResources("AWS::CertificateManager::Certificate", 1)
  );
  expectCdk(stack).to(countResources("AWS::Route53::RecordSet", 0));
  expectCdk(stack).to(countResources("AWS::Route53::HostedZone", 0));
});

test("customDomain-props-domainName-apigDomainName-hostedZone-redefined-error", async () => {
  const stack = new Stack(new App(), "stack");
  apig.DomainName.fromDomainNameAttributes = jest
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
        domainName: apig.DomainName.fromDomainNameAttributes(
          stack,
          "DomainName",
          {
            name: "name",
            regionalDomainName: "api.domain.com",
            regionalHostedZoneId: "id",
          }
        ) as apig.DomainName,
        hostedZone: "domain.com",
      },
    });
  }).toThrow(
    /Cannot configure the "hostedZone" when the "domainName" is a construct/
  );
});

test("customDomain-props-domainName-apigDomainName-certificate-redefined-error", async () => {
  const stack = new Stack(new App(), "stack");
  apig.DomainName.fromDomainNameAttributes = jest
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
    });
  }).toThrow(
    /Cannot configure the "certificate" when the "domainName" is a construct/
  );
});

test("customDomain-props-stage-is-imported-error", async () => {
  const stack = new Stack(new App(), "stack");
  const iApi = importWebSocketApiFromAnotherStack(stack);
  expect(() => {
    new WebSocketApi(stack, "Api", {
      customDomain: "api.domain.com",
      webSocketApi: iApi.webSocketApi,
      webSocketStage: iApi.webSocketStage,
    });
  }).toThrow(
    /Cannot configure the "customDomain" when "webSocketStage" is a construct/
  );
});

test("customDomain-props-domainName-defined-in-stage", async () => {
  const stack = new Stack(new App(), "stack");
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
      webSocketStage: {
        domainMapping: { domainName },
      },
    });
  }).toThrow(
    /Do not configure the "webSocketStage.domainMapping". Use the "customDomain" to configure the Api domain./
  );
});

test("authorizationType-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new WebSocketApi(stack, "Api", {
      routes: {
        $connect: "test/lambda.handler",
        $default: "test/lambda.handler",
      },
      authorizationType: "ABC" as WebSocketApiAuthorizationType.IAM,
    });
  }).toThrow(
    /sst.WebSocketApi does not currently support ABC. Only "IAM" and "CUSTOM" are currently supported./
  );
});

test("authorizationType-iam", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizationType: WebSocketApiAuthorizationType.IAM,
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 1, {
      AuthorizationType: "AWS_IAM",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "AWS_IAM",
    })
  );
});

test("authorizationType-none", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizationType: WebSocketApiAuthorizationType.NONE,
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 2, {
      AuthorizationType: "NONE",
    })
  );
});

test("authorizationType-default", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 2));
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 2, {
      AuthorizationType: "NONE",
    })
  );
});

test("authorizationType-custom", async () => {
  const stack = new Stack(new App(), "stack");
  const handler = new Function(stack, "Authorizer", {
    handler: "test/lambda.handler",
  });
  const authorizer = new apigAuthorizers.WebSocketLambdaAuthorizer("Authorizer", handler, {
    authorizerName: "LambdaAuthorizer",
  });
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizationType: WebSocketApiAuthorizationType.CUSTOM,
    authorizer: authorizer,
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 1, {
      AuthorizationType: "NONE",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "$default",
      AuthorizationType: "NONE",
    })
  );
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 1, {
      AuthorizationType: "CUSTOM",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "CUSTOM",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Authorizer", {
      Name: "LambdaAuthorizer",
      AuthorizerType: "REQUEST",
      AuthorizerPayloadFormatVersion: ABSENT,
      AuthorizerResultTtlInSeconds: ABSENT,
      IdentitySource: ["$request.header.Authorization"],
    })
  );
});

test("authorizationType-custom: override identitySource", async () => {
  const stack = new Stack(new App(), "stack");
  const handler = new Function(stack, "Authorizer", {
    handler: "test/lambda.handler",
  });
  const authorizer = new apigAuthorizers.WebSocketLambdaAuthorizer("Authorizer", handler, {
    authorizerName: "LambdaAuthorizer",
    identitySource: ["route.request.querystring.Auth"],
  });
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $default: "test/lambda.handler",
    },
    authorizationType: WebSocketApiAuthorizationType.CUSTOM,
    authorizer: authorizer,
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 1, {
      AuthorizationType: "NONE",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "$default",
      AuthorizationType: "NONE",
    })
  );
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGatewayV2::Route", 1, {
      AuthorizationType: "CUSTOM",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      RouteKey: "$connect",
      AuthorizationType: "CUSTOM",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Authorizer", {
      Name: "LambdaAuthorizer",
      AuthorizerType: "REQUEST",
      AuthorizerPayloadFormatVersion: ABSENT,
      AuthorizerResultTtlInSeconds: ABSENT,
      IdentitySource: ["route.request.querystring.Auth"],
    })
  );
});

test("routes-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api");
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Api", 1));
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 0));
});

test("routes-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {},
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Api", 1));
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 0));
});

test("route-string", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
      $default: "test/lambda.handler",
      custom: "test/lambda.handler",
    },
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 4));
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 4, {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-string-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
      environment: {
        keyA: "valueA",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 3,
      Environment: {
        Variables: {
          keyA: "valueA",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

test("route-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: f,
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-Function-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new WebSocketApi(stack, "Api", {
      routes: {
        $connect: f,
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("route-FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        handler: "test/lambda.handler",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-FunctionProps-with-defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        handler: "test/lambda.handler",
      },
    },
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 3,
    })
  );
});

test("route-FunctionProps-with-defaultFunctionProps-override", async () => {
  const stack = new Stack(new App(), "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        handler: "test/lambda.handler",
        timeout: 5,
        environment: {
          keyA: "valueA",
        },
      },
    },
    defaultFunctionProps: {
      timeout: 3,
      environment: {
        keyB: "valueB",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 5,
      Environment: {
        Variables: {
          keyA: "valueA",
          keyB: "valueB",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
});

test("route-FunctionProps-with-defaultFunctionProps-override-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    environment: { keyC: "valueC" },
  });

  const stack = new Stack(app, "stack");
  new WebSocketApi(stack, "Api", {
    routes: {
      $connect: {
        handler: "test/lambda.handler",
        timeout: 5,
        environment: {
          keyA: "valueA",
        },
      },
    },
    defaultFunctionProps: {
      timeout: 3,
      environment: {
        keyB: "valueB",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
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
    })
  );
});

///////////////////
// Test Properties
///////////////////

test("routes: no routes", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {});
  expect(api.routes).toEqual([]);
});

test("routes: has routes", async () => {
  const stack = new Stack(new App(), "stack");
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

test("get-function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
  });
  expect(ret.getFunction("$connect")).toBeDefined();
});

test("get-function-trailing-spaces", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      "$connect ": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("$connect")).toBeDefined();
  expect(ret.getFunction("$connect ")).toBeDefined();
});

test("get-function-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
    },
  });
  expect(ret.getFunction("$disconnect")).toBeUndefined();
});

test("addRoutes-existing-route", async () => {
  const stack = new Stack(new App(), "stack");
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
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          manageConnectionsPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          manageConnectionsPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermissionsToRoute", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: {
      $connect: "test/lambda.handler",
      $disconnect: "test/lambda.handler",
    },
  });
  api.attachPermissionsToRoute("$connect", ["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          manageConnectionsPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy, manageConnectionsPolicy],
        Version: "2012-10-17",
      },
    })
  );
});

test("attachPermissions-after-addRoutes", async () => {
  const app = new App();
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
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          manageConnectionsPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          manageConnectionsPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
    })
  );
  expectCdk(stackB).to(
    haveResource("AWS::IAM::Policy", {
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
                      "dev-my-app-stackA:ExportsOutputRefApiCD79AAA0A1504A18",
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
    })
  );
});
