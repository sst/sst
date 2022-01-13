import {
  ABSENT,
  objectLike,
  countResources,
  hasResource,
} from "./helper";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as logs from "aws-cdk-lib/aws-logs";
import {
  App,
  Stack,
  Api,
  ApiAuthorizationType,
  ApiPayloadFormatVersion,
  Function,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("constructor: httpApi is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {});
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
  });
});

test("constructor: httpApi is props", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    httpApi: {
      disableExecuteApiEndpoint: true,
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
    DisableExecuteApiEndpoint: true,
  });
});

test("constructor: httpApi is construct", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    httpApi: new apig.HttpApi(stack, "MyHttpApi", {
      apiName: "existing-api",
    }),
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "existing-api",
  });
});

test("constructor: httpApi is import", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    httpApi: apig.HttpApi.fromHttpApiAttributes(stack, "IApi", {
      httpApiId: "abc",
    }),
  });
  countResources(stack, "AWS::ApiGatewayV2::Api", 0);
});

test("cors-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: true,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    CorsConfiguration: {
      AllowHeaders: ["*"],
      AllowMethods: ["*"],
      AllowOrigins: ["*"],
    },
  });
});

test("cors-true", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: true,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    CorsConfiguration: {
      AllowHeaders: ["*"],
      AllowMethods: ["*"],
      AllowOrigins: ["*"],
    },
  });
});

test("cors-false", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: false,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    CorsConfiguration: ABSENT,
  });
});

test("cors-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: {
      allowMethods: [apig.CorsHttpMethod.GET],
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    CorsConfiguration: {
      AllowMethods: ["GET"],
    },
  });
});

test("cors-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      cors: true,
      httpApi: new apig.HttpApi(stack, "HttpApi"),
    });
  }).toThrow(/Cannot configure the "cors" when "httpApi" is a construct/);
});

test("accessLog-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: true,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","routeKey":"$context.routeKey","status":$context.status,"responseLatency":$context.responseLatency,"integrationRequestId":"$context.integration.requestId","integrationStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
    },
  });
});

test("accessLog-true", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","routeKey":"$context.routeKey","status":$context.status,"responseLatency":$context.responseLatency,"integrationRequestId":"$context.integration.requestId","integrationStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
    },
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    RetentionInDays: ABSENT,
  });
});

test("accessLog-false", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    AccessLogSettings: ABSENT,
  });
});

test("accessLog-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
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
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
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
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: {
      format: "$context.requestTime",
      retention: "ONE_WEEK",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      accessLog: {
        // @ts-ignore Allow non-existant value
        retention: "NOT_EXIST",
      },
    });
  }).toThrow(/Invalid access log retention value "NOT_EXIST"./);
});

test("accessLog-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApi: new apig.HttpApi(stack, "HttpApi"),
    });
  }).toThrow(/Cannot configure the "accessLog" when "httpApi" is a construct/);
});

test("throttling: not throttled", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {});
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    DefaultRouteSettings: ABSENT,
  });
});

test("throttling: throttled", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    defaultThrottlingBurstLimit: 100,
    defaultThrottlingRateLimit: 1000,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    DefaultRouteSettings: {
      ThrottlingBurstLimit: 100,
      ThrottlingRateLimit: 1000,
    },
  });
});

test("constructor: stages", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
    httpApi: {
      createDefaultStage: false,
    },
    stages: [
      {
        stageName: "alpha",
      },
      {
        stageName: "beta",
      },
    ],
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    StageName: "alpha",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    StageName: "beta",
  });
});

test("constructor: customDomain is string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new Api(stack, "Api", {
    customDomain: "api.domain.com",
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(api.customDomainUrl).toMatch(/https:\/\/api.domain.com/);
  expect(api.apiGatewayDomain).toBeDefined();
  expect(api.acmCertificate).toBeDefined();
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
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
    Stage: "$default",
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
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("constructor: customDomain is string (uppercase error)", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: "API.domain.com",
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("constructor: customDomain is string (imported ssm)", async () => {
  const stack = new Stack(new App(), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: domain,
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("constructor: customDomain.domainName is string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
      path: "users",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(api.customDomainUrl).toMatch(/https:\/\/api.domain.com\/users\//);
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
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
    Stage: "$default",
    ApiMappingKey: "users",
  });
  hasResource(stack, "AWS::CertificateManager::Certificate", {
    DomainName: "api.domain.com",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "api.domain.com.",
  });
});

test("constructor: customDomain.domainName is string (uppercase error)", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: {
        domainName: "API.domain.com",
      },
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("constructor: customDomain.domainName is string (imported ssm), hostedZone undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: {
        domainName: domain,
      },
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("constructor: customDomain.domainName is string (imported ssm), hostedZone defined", async () => {
  const stack = new Stack(new App(), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  new Api(stack, "Api", {
    customDomain: {
      domainName: domain,
      hostedZone: "domain.com",
    },
  });

  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: "ApiCertificate285C31EB" },
        EndpointType: "REGIONAL",
      },
    ],
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
    Type: "A",
  });
});

test("constructor: customDomain.hostedZone-generated-from-minimal-domainName", async () => {
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
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("constructor: customDomain.hostedZone-generated-from-full-domainName", async () => {
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
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("constructor: customDomain props-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      httpApi: new apig.HttpApi(stack, "HttpApi"),
    });
  }).toThrow(
    /Cannot configure the "customDomain" when "httpApi" is a construct/
  );
});

test("constructor: customDomain.domainName-apigDomainName", async () => {
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

  new Api(stack, "Api", {
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
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
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
    Stage: "$default",
    ApiMappingKey: "users",
  });
  countResources(stack, "AWS::CertificateManager::Certificate", 1);
  countResources(stack, "AWS::Route53::RecordSet", 0);
  countResources(stack, "AWS::Route53::HostedZone", 0);
});

test("constructor: customDomain.domainName-apigDomainName-hostedZone-redefined-error", async () => {
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
    new Api(stack, "Api", {
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

test("constructor: customDomain.domainName-apigDomainName-certificate-redefined-error", async () => {
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
    new Api(stack, "Api", {
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

test("defaultAuthorizationType-invalid", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": "test/lambda.handler",
      },
      defaultAuthorizationType: "ABC" as ApiAuthorizationType.JWT,
    });
  }).toThrow(
    /sst.Api does not currently support ABC. Only "AWS_IAM", "JWT" and "CUSTOM" are currently supported./
  );
});

test("defaultAuthorizationType-iam", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "AWS_IAM",
  });
});

test("defaultAuthorizationType-JWT-userpool", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool");
  const userPoolClient = userPool.addClient("UserPoolClient");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpUserPoolAuthorizer("Authorizer", userPool, {
      userPoolClients: [userPoolClient],
    }),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "JWT",
    AuthorizerId: { Ref: "ApiAuthorizerEA5E7D9A" },
    AuthorizationScopes: ["user.id", "user.email"],
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "Authorizer",
    AuthorizerType: "JWT",
    IdentitySource: ["$request.header.Authorization"],
    JwtConfiguration: {
      Audience: [{ Ref: "UserPoolUserPoolClient40176907" }],
      Issuer: {
        "Fn::Join": [
          "",
          [
            "https://cognito-idp.us-east-1.amazonaws.com/",
            { Ref: "UserPool6BA7E5F2" },
          ],
        ],
      },
    },
  });
});

test("defaultAuthorizationType-JWT-auth0", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer("Authorizer", "https://abc.us.auth0.com", {
      jwtAudience: ["123"],
    }),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "JWT",
    AuthorizerId: { Ref: "ApiAuthorizerEA5E7D9A" },
    AuthorizationScopes: ["user.id", "user.email"],
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "Authorizer",
    AuthorizerType: "JWT",
    IdentitySource: ["$request.header.Authorization"],
    JwtConfiguration: {
      Audience: ["123"],
      Issuer: "https://abc.us.auth0.com",
    },
  });
});

test("defaultAuthorizationType-JWT-missing-authorizer", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": "test/lambda.handler",
      },
      defaultAuthorizationType: ApiAuthorizationType.JWT,
    });
  }).toThrow(/Missing JWT authorizer/);
});

test("defaultAuthorizationType-CUSTOM", async () => {
  const stack = new Stack(new App(), "stack");
  const handler = new Function(stack, "Authorizer", {
    handler: "test/lambda.handler",
  });
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
    defaultAuthorizer: new apigAuthorizers.HttpLambdaAuthorizer("Authorizer", handler, {
      authorizerName: "LambdaAuthorizer",
      responseTypes: [apigAuthorizers.HttpLambdaResponseType.SIMPLE],
    }),
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-my-app-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "CUSTOM",
    AuthorizerId: { Ref: "ApiAuthorizerEA5E7D9A" },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "LambdaAuthorizer",
    AuthorizerType: "REQUEST",
    AuthorizerPayloadFormatVersion: "2.0",
    AuthorizerResultTtlInSeconds: 300,
    IdentitySource: ["$request.header.Authorization"],
  });
});

test("defaultAuthorizationType-none", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: ApiAuthorizationType.NONE,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("defaultAuthorizationType-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("routes: undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api");
  countResources(stack, "AWS::ApiGatewayV2::Api", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 0);
});

test("routes: empty", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {},
  });
  countResources(stack, "AWS::ApiGatewayV2::Api", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 0);
});

test("routes: route key: invalid", async () => {
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

test("routes: route key: method is invalid", async () => {
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

test("routes: route key: path is invalid", async () => {
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

test("routes: route key: $default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      $default: "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    RouteKey: "$default",
    AuthorizationType: "NONE",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: string", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: string-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultFunctionProps: {
      timeout: 3,
      environment: {
        keyA: "valueA",
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

test("routes: Function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Api(stack, "Api", {
    routes: {
      "GET /": f,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: Function-with-defaultFunctionProps", async () => {
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
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("routes: FunctionProps-empty", async () => {
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

test("routes: FunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        handler: "test/lambda.handler",
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: FunctionProps-with-defaultFunctionProps", async () => {
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
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("routes: FunctionProps-with-defaultFunctionProps-override", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
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

test("routes: FunctionProps-with-defaultFunctionProps-override-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    environment: { keyC: "valueC" },
  });

  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
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

test("routes: ApiFunctionRouteProps-function-string", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: ApiFunctionRouteProps-function-string-with-defaultFunctionProps", async () => {
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
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("routes: ApiFunctionRouteProps-function-Function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Api(stack, "Api", {
    routes: {
      "GET /": { function: f },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: ApiFunctionRouteProps-function-Function-with-defaultFunctionProps", async () => {
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
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("routes: ApiFunctionRouteProps-function-FunctionProps", async () => {
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
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("routes: ApiFunctionRouteProps-function-FunctionProps-with-defaultFunctionProps", async () => {
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
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("routes: ApiFunctionRouteProps-function-FunctionProps-with-defaultFunctionProps-override", async () => {
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
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 5,
  });
});

test("routes: ApiFunctionRouteProps-authorizationType-invalid", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          function: {
            handler: "test/lambda.handler",
          },
          authorizationType: "ABC" as ApiAuthorizationType.JWT,
        },
      },
    });
  }).toThrow(
    /sst.Api does not currently support ABC. Only "AWS_IAM", "JWT" and "CUSTOM" are currently supported./
  );
});

test("routes: ApiFunctionRouteProps-authorizationType-override-AWSIAM-by-NONE", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
        },
        authorizationType: ApiAuthorizationType.NONE,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("routes: ApiFunctionRouteProps-authorizationType-override-JWT-by-NONE", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer("Authorizer", "https://abc.us.auth0.com", {
      jwtAudience: ["123"],
    }),
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizationType: ApiAuthorizationType.NONE,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("routes: ApiFunctionRouteProps-authorizationType-override-JWT-by-JWT", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer("Authorizer", "https://abc.us.auth0.com", {
      jwtAudience: ["123"],
    }),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizationType: ApiAuthorizationType.JWT,
        authorizer: new apigAuthorizers.HttpJwtAuthorizer("Authorizer", "https://xyz.us.auth0.com", {
          jwtAudience: ["234"],
        }),
        authorizationScopes: ["user.profile"],
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "JWT",
    AuthorizerId: { Ref: "ApiAuthorizerEA5E7D9A" },
    AuthorizationScopes: ["user.profile"],
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "Authorizer",
    AuthorizerType: "JWT",
    IdentitySource: ["$request.header.Authorization"],
    JwtConfiguration: {
      Audience: ["234"],
      Issuer: "https://xyz.us.auth0.com",
    },
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-default", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    PayloadFormatVersion: "2.0",
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-v1", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    defaultPayloadFormatVersion: ApiPayloadFormatVersion.V1,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-v2-override-by-v1", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    defaultPayloadFormatVersion: ApiPayloadFormatVersion.V2,
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        payloadFormatVersion: ApiPayloadFormatVersion.V1,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Api(stack, "Api", {
      defaultPayloadFormatVersion: "ABC" as ApiPayloadFormatVersion.V1,
      routes: {
        "GET /": "test/lambda.handler",
      },
    });
  }).toThrow(/sst.Api does not currently support ABC payload format version./);
});

test("routes: ApiAlbRouteProps method is undefined", async () => {
  const stack = new Stack(new App(), "stack");

  // Ceate ALB listener
  const vpc = new ec2.Vpc(stack, "VPC");
  const lb = new elb.ApplicationLoadBalancer(stack, "LB", { vpc });
  const listener = lb.addListener("Listener", { port: 80 });
  const asg = new autoscaling.AutoScalingGroup(stack, "ASG", {
    vpc,
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.BURSTABLE2,
      ec2.InstanceSize.MICRO
    ),
    machineImage: new ec2.AmazonLinuxImage(),
  });
  listener.addTargets("ApplicationFleet", {
    port: 8080,
    targets: [asg],
  });

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        albListener: listener,
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::EC2::VPC", 1);
  countResources(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
  countResources(stack, "AWS::ElasticLoadBalancingV2::Listener", 1);
  countResources(stack, "AWS::ApiGatewayV2::VpcLink", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 1);
  countResources(stack, "AWS::ApiGatewayV2::Integration", 1);
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    ApiId: {
      Ref: "ApiCD79AAA0",
    },
    IntegrationType: "HTTP_PROXY",
    ConnectionId: {
      Ref: "ApiVpcLink195B99851",
    },
    ConnectionType: "VPC_LINK",
    IntegrationMethod: "ANY",
    IntegrationUri: {
      Ref: "LBListener49E825B4",
    },
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiAlbRouteProps method is string", async () => {
  const stack = new Stack(new App(), "stack");

  // Ceate ALB listener
  const vpc = new ec2.Vpc(stack, "VPC");
  const lb = new elb.ApplicationLoadBalancer(stack, "LB", { vpc });
  const listener = lb.addListener("Listener", { port: 80 });
  const asg = new autoscaling.AutoScalingGroup(stack, "ASG", {
    vpc,
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.BURSTABLE2,
      ec2.InstanceSize.MICRO
    ),
    machineImage: new ec2.AmazonLinuxImage(),
  });
  listener.addTargets("ApplicationFleet", {
    port: 8080,
    targets: [asg],
  });

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        albListener: listener,
        method: "POST",
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::EC2::VPC", 1);
  countResources(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
  countResources(stack, "AWS::ElasticLoadBalancingV2::Listener", 1);
  countResources(stack, "AWS::ApiGatewayV2::VpcLink", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 1);
  countResources(stack, "AWS::ApiGatewayV2::Integration", 1);
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    ApiId: {
      Ref: "ApiCD79AAA0",
    },
    IntegrationType: "HTTP_PROXY",
    ConnectionId: {
      Ref: "ApiVpcLink195B99851",
    },
    ConnectionType: "VPC_LINK",
    IntegrationMethod: "POST",
    IntegrationUri: {
      Ref: "LBListener49E825B4",
    },
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiAlbRouteProps method is HttpMethod", async () => {
  const stack = new Stack(new App(), "stack");

  // Ceate ALB listener
  const vpc = new ec2.Vpc(stack, "VPC");
  const lb = new elb.ApplicationLoadBalancer(stack, "LB", { vpc });
  const listener = lb.addListener("Listener", { port: 80 });
  const asg = new autoscaling.AutoScalingGroup(stack, "ASG", {
    vpc,
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.BURSTABLE2,
      ec2.InstanceSize.MICRO
    ),
    machineImage: new ec2.AmazonLinuxImage(),
  });
  listener.addTargets("ApplicationFleet", {
    port: 8080,
    targets: [asg],
  });

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        albListener: listener,
        method: apig.HttpMethod.DELETE,
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::EC2::VPC", 1);
  countResources(stack, "AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
  countResources(stack, "AWS::ElasticLoadBalancingV2::Listener", 1);
  countResources(stack, "AWS::ApiGatewayV2::VpcLink", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 1);
  countResources(stack, "AWS::ApiGatewayV2::Integration", 1);
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    ApiId: {
      Ref: "ApiCD79AAA0",
    },
    IntegrationType: "HTTP_PROXY",
    ConnectionId: {
      Ref: "ApiVpcLink195B99851",
    },
    ConnectionType: "VPC_LINK",
    IntegrationMethod: "DELETE",
    IntegrationUri: {
      Ref: "LBListener49E825B4",
    },
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiHttpRouteProps method is undefined", async () => {
  const stack = new Stack(new App(), "stack");

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        url: "https://domain.com",
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::ApiGatewayV2::Route", 1);
  countResources(stack, "AWS::ApiGatewayV2::Integration", 1);
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    ApiId: {
      Ref: "ApiCD79AAA0",
    },
    IntegrationType: "HTTP_PROXY",
    IntegrationMethod: "ANY",
    IntegrationUri: "https://domain.com",
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiHttpRouteProps method is string", async () => {
  const stack = new Stack(new App(), "stack");

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        url: "https://domain.com",
        method: "POST",
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    IntegrationMethod: "POST",
    IntegrationUri: "https://domain.com",
  });
});

test("routes: ApiHttpRouteProps method is HttpMethod", async () => {
  const stack = new Stack(new App(), "stack");

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        url: "https://domain.com",
        method: apig.HttpMethod.DELETE,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    IntegrationMethod: "DELETE",
    IntegrationUri: "https://domain.com",
  });
});

///////////////////
// Test Properties
///////////////////

test("routes: no routes", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {});
  expect(api.routes).toEqual([]);
});

test("routes: has routes", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
      $default: "test/lambda.handler",
    },
  });
  expect(api.routes).toEqual(["GET /", "GET /2", "$default"]);
});

///////////////////
// Test Methods
///////////////////

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

test("addRoutes-existing-route", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  expect(() => {
    api.addRoutes(stack, {
      "GET /": "test/lambda.handler",
    });
  }).toThrow(/A route already exists for "GET \/"/);
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
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
  });
  hasResource(stack, "AWS::IAM::Policy", {
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
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
  });
});

test("attachPermissions-after-addRoutes", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new Api(stackA, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  api.addRoutes(stackB, {
    "GET /3": "test/lambda.handler",
  });
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
  });
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
  });
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "LambdaGET3ServiceRoleDefaultPolicy21DC01C7",
  });
});

test("arn property", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {});
  expect(api.httpApiArn).toBeDefined();

  const apiId = api.httpApi.apiId;
  const region = Stack.of(api).region;
  const partition = Stack.of(api).partition;

  expect(api.httpApiArn).toContain(
    `arn:${partition}:apigateway:${region}::/apis/${apiId}`
  );
});
