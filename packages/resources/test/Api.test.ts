import { test, expect, vi, beforeEach } from "vitest";
import { ANY, ABSENT, objectLike, countResources, hasResource } from "./helper";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { App, Stack, Api, Function, FunctionDefinition } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

const actualHostedZoneFromLookup = route53.HostedZone.fromLookup;

beforeEach(() => {
  route53.HostedZone.fromLookup = actualHostedZoneFromLookup;
})

///////////////////
// Test Constructor
///////////////////

test("constructor: httpApi is undefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const api = new Api(stack, "Api", {});
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
  });
});

test("constructor: httpApi is props", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    cdk: {
      httpApi: {
        disableExecuteApiEndpoint: true,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
    DisableExecuteApiEndpoint: true,
  });
});

test("constructor: httpApi is construct", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    cdk: {
      httpApi: new apig.HttpApi(stack, "MyHttpApi", {
        apiName: "existing-api",
      }),
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "existing-api",
  });
});

test("constructor: httpApi is import", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    cdk: {
      httpApi: apig.HttpApi.fromHttpApiAttributes(stack, "IApi", {
        httpApiId: "abc",
      }),
    },
  });
  countResources(stack, "AWS::ApiGatewayV2::Api", 0);
});

test("cors-undefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    cors: false,
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    CorsConfiguration: ABSENT,
  });
});

test("cors-props", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    cors: {
      allowMethods: [apig.CorsHttpMethod.GET],
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    CorsConfiguration: {
      AllowHeaders: ["*"],
      AllowMethods: ["GET"],
      AllowOrigins: ["*"],
    },
  });
});

test("cors-redefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      cors: true,
      cdk: {
        httpApi: new apig.HttpApi(stack, "HttpApi"),
      },
    });
  }).toThrow(/Cannot configure the "cors" when "cdk.httpApi" is a construct/);
});

test("accessLog-undefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
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
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      accessLog: {
        // @ts-ignore Allow non-existant value
        retention: "NOT_EXIST",
      },
    });
  }).toThrow(/Invalid access log retention value "NOT_EXIST"./);
});

test("accessLog.retention: RetentionDays", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
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

test("accessLog-redefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      cdk: {
        httpApi: new apig.HttpApi(stack, "HttpApi"),
      },
    });
  }).toThrow(
    /Cannot configure the "accessLog" when "cdk.httpApi" is a construct/
  );
});

test("throttling: not throttled", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {});
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    DefaultRouteSettings: ABSENT,
  });
});

test("throttling: throttled", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    defaults: {
      throttle: {
        burst: 100,
        rate: 1000,
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    DefaultRouteSettings: {
      ThrottlingBurstLimit: 100,
      ThrottlingRateLimit: 1000,
    },
  });
});

test("constructor: stages", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
    cdk: {
      httpApi: {
        createDefaultStage: false,
      },
      httpStages: [
        {
          stageName: "alpha",
        },
        {
          stageName: "beta",
        },
      ],
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    StageName: "alpha",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Stage", {
    StageName: "beta",
  });
});

test("customDomain: string", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
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
  expect(api.cdk.domainName).toBeDefined();
  expect(api.cdk.certificate).toBeDefined();
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
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
});

test("customDomain: string (uppercase error)", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: "API.domain.com",
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain: string (imported ssm)", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: domain,
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("customDomain: internal domain: domainName is string", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
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
    Name: "dev-api-Api",
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
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "api.domain.com.",
    Type: "AAAA",
  });
});

test("customDomain: internal domain: domainName is string (uppercase error)", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: {
        domainName: "API.domain.com",
      },
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain: internal domain: domainName is string (imported ssm) AND hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  new Api(stack, "Api", {
    customDomain: {
      domainName: domain,
      hostedZone: "domain.com",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: {
      Ref: ANY
    }
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: ANY
    },
    Type: "A",
  });
});

test("customDomain: internal domain: domainName is string (imported ssm) AND cdk.hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  new Api(stack, "Api", {
    customDomain: {
      domainName: domain,
      cdk: {
        hostedZone: new route53.HostedZone(stack, "Zone", {
          zoneName: "domain.com",
        }),
      }
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: {
      Ref: ANY
    }
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: ANY
    },
    Type: "A",
  });
});

test("customDomain: internal domain: domainName is string (imported ssm), hostedZone undefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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

test("customDomain: isExternalDomain", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const site = new Api(stack, "Site", {
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
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Site",
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

test("customDomain: isExternalDomain and imported domainName", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  const site = new Api(stack, "Site", {
    customDomain: {
      domainName: domain,
      isExternalDomain: true,
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::DomainName", {
    DomainName: { Ref: ANY },
    DomainNameConfigurations: [
      {
        CertificateArn: { Ref: ANY },
        EndpointType: "REGIONAL",
      },
    ],
  });
});

test("customDomain: isExternalDomain and no certificate", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Site", {
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain and hostedZone set", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Site", {
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
        hostedZone: "domain.com",
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

test("customDomain.domainName is string (imported ssm), hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
    Type: "AAAA",
  });
});

test("customDomain.hostedZone-generated-from-minimal-domainName", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
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
});

test("customDomain.hostedZone-generated-from-full-domainName", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  route53.HostedZone.fromLookup = vi
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
});

test("customDomain props-redefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      cdk: {
        httpApi: new apig.HttpApi(stack, "HttpApi"),
      },
    });
  }).toThrow(
    /Cannot configure the "customDomain" when "cdk.httpApi" is a construct/
  );
});

test("customDomain: cdk.domainName is apigDomainName", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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

  new Api(stack, "Api", {
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
    Name: "dev-api-Api",
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
});

test("customDomain: cdk.domainName and hostedZone co-exist error", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: {
        hostedZone: "domain.com",
        cdk: {
          domainName: new apig.DomainName(stack, "DomainName", {
            certificate: new acm.Certificate(stack, "Cert", {
              domainName: "api.domain.com",
            }),
            domainName: "api.domain.com",
          }),
        },
      },
    });
  }).toThrow(
    /Cannot configure the "hostedZone" when the "domainName" is a construct/
  );
});

test("customDomain: cdk.domainName and cdk.hostedZone co-exist error", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      customDomain: {
        cdk: {
          domainName: new apig.DomainName(stack, "DomainName", {
            certificate: new acm.Certificate(stack, "Cert", {
              domainName: "api.domain.com",
            }),
            domainName: "api.domain.com",
          }),
          hostedZone: new route53.HostedZone(stack, "Zone", {
            zoneName: "domain.com",
          }),
        },
      },
    });
  }).toThrow(
    /Cannot configure the "hostedZone" when the "domainName" is a construct/
  );
});

test("customDomain.domainName-apigDomainName-certificate-redefined-error", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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
    new Api(stack, "Api", {
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

test("authorizers: iam key", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      authorizers: {
        iam: { type: "jwt" },
      },
    });
  }).toThrow(/Cannot name an authorizer "iam"/);
});

test("authorizers: none key", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      authorizers: {
        none: { type: "jwt" },
      },
    });
  }).toThrow(/Cannot name an authorizer "none"/);
});

test("defaults: authorizer iam", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaults: {
      authorizer: "iam",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "AWS_IAM",
  });
});

test("defaults: authorizer user_pool", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool");
  const userPoolClient = userPool.addClient("UserPoolClient");
  new Api(stack, "Api", {
    authorizers: {
      Authorizer: {
        type: "user_pool",
        userPool: {
          id: userPool.userPoolId,
          clientIds: [userPoolClient.userPoolClientId],
        },
      },
    },
    defaults: {
      authorizer: "Authorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
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

test("defaults: authorizer cdk user_pool", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool");
  const userPoolClient = userPool.addClient("UserPoolClient");
  const authorizer = new apigAuthorizers.HttpUserPoolAuthorizer(
    "Authorizer",
    userPool,
    {
      userPoolClients: [userPoolClient],
    }
  );
  new Api(stack, "Api", {
    authorizers: {
      Authorizer: {
        type: "user_pool",
        cdk: { authorizer },
      },
    },
    defaults: {
      authorizer: "Authorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
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

test("defaults: authorizer jwt", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    authorizers: {
      Authorizer: {
        type: "jwt",
        jwt: {
          issuer: "https://abc.us.auth0.com",
          audience: ["123"],
        },
      },
    },
    defaults: {
      authorizer: "Authorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
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

test("defaults: authorizer jwt missing authorizer", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": "test/lambda.handler",
      },
      defaults: {
        // @ts-ignore Allow non-existant value
        authorizer: "foo",
      },
    });
  }).toThrow(/Cannot find authorizer "foo"/);
});

test("defaults. authorizer lambda", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    authorizers: {
      Authorizer: {
        type: "lambda",
        name: "LambdaAuthorizer",
        function: new Function(stack, "Authorizer", {
          handler: "test/lambda.handler",
        }),
        responseTypes: ["simple"],
      },
    },
    defaults: {
      authorizer: "Authorizer",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Api", {
    Name: "dev-api-Api",
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "CUSTOM",
    AuthorizerId: { Ref: "ApiAuthorizerEA5E7D9A" },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "LambdaAuthorizer",
    AuthorizerType: "REQUEST",
    AuthorizerPayloadFormatVersion: "2.0",
    AuthorizerResultTtlInSeconds: 0,
    IdentitySource: ["$request.header.Authorization"],
  });
});

test("defaults: authorizer none", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaults: {
      authorizer: "none",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("defaults: authorizer undefined", async () => {
  const app = new App({ name: "api" });
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
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api");
  countResources(stack, "AWS::ApiGatewayV2::Api", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 0);
});

test("routes: empty", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {},
  });
  countResources(stack, "AWS::ApiGatewayV2::Api", 1);
  countResources(stack, "AWS::ApiGatewayV2::Route", 0);
});

test("routes: route key: invalid", async () => {
  const app = new App({ name: "api" });
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
  const app = new App({ name: "api" });
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
  const app = new App({ name: "api" });
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
  const app = new App({ name: "api" });
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
  const app = new App({ name: "api" });
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

test("routes: string-with-defaults.function", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
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

test("routes: Function", async () => {
  const app = new App({ name: "api" });
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

test("routes: Function-with-defaults.function", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": f,
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("routes: FunctionProps-empty", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          function: {} as FunctionDefinition,
        },
      },
    });
  }).toThrow(/Invalid function definition/);
});

test("routes: ApiFunctionRouteProps-function-string", async () => {
  const app = new App({ name: "api" });
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

test("routes: ApiFunctionRouteProps-function-string-with-defaults.function", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
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

test("routes: ApiFunctionRouteProps-function-Function", async () => {
  const app = new App({ name: "api" });
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

test("routes: ApiFunctionRouteProps-function-Function-with-defaults.function", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": { function: f },
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("routes: ApiFunctionRouteProps-function-FunctionProps", async () => {
  const app = new App({ name: "api" });
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

test("routes: ApiFunctionRouteProps-function-FunctionProps-with-defaults.function", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
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

test("routes: ApiFunctionRouteProps-function-FunctionProps-with-defaults.function-override", async () => {
  const app = new App({ name: "api" });
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
    defaults: {
      function: {
        timeout: 3,
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 5,
  });
});

test("routes: ApiFunctionRouteProps-authorizer-not-found", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new Api(stack, "Api", {
      routes: {
        "GET /": {
          function: {
            handler: "test/lambda.handler",
          },
          // @ts-ignore Allow non-existant value
          authorizer: "ABC",
        },
      },
    });
  }).toThrow(/Cannot find authorizer "ABC"/);
});

test("routes: ApiFunctionRouteProps-authorizationType-override-iam-by-none", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaults: {
      authorizer: "iam",
    },
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
        },
        authorizer: "none",
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("routes: ApiFunctionRouteProps-authorizationType-override-jwt-by-none", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    authorizers: {
      Authorizer: {
        type: "jwt",
        jwt: {
          issuer: "https://abc.us.auth0.com",
          audience: ["123"],
        },
      },
    },
    defaults: {
      authorizer: "Authorizer",
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizer: "none",
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "NONE",
  });
});

test("routes: ApiFunctionRouteProps-authorizationType-override-jwt-by-jwt", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    authorizers: {
      Authorizer: {
        type: "jwt",
        jwt: {
          issuer: "https://abc.us.auth0.com",
          audience: ["123"],
        },
      },
      Authorizer2: {
        type: "jwt",
        jwt: {
          issuer: "https://xyz.us.auth0.com",
          audience: ["234"],
        },
      },
    },
    defaults: {
      authorizer: "Authorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizer: "Authorizer2",
        authorizationScopes: ["user.profile"],
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Route", {
    AuthorizationType: "JWT",
    AuthorizerId: { Ref: "ApiAuthorizer2B176AA51" },
    AuthorizationScopes: ["user.profile"],
  });
  hasResource(stack, "AWS::ApiGatewayV2::Authorizer", {
    Name: "Authorizer2",
    AuthorizerType: "JWT",
    IdentitySource: ["$request.header.Authorization"],
    JwtConfiguration: {
      Audience: ["234"],
      Issuer: "https://xyz.us.auth0.com",
    },
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-default", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    defaults: {
      payloadFormatVersion: "1.0",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-v2-override-by-v1", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    defaults: {
      payloadFormatVersion: "2.0",
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        payloadFormatVersion: "1.0",
      },
    },
  });
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    PayloadFormatVersion: "1.0",
  });
});

test("routes: ApiFunctionRouteProps-payloadFormatVersion-invalid", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  expect(() => {
    new Api(stack, "Api", {
      defaults: {
        payloadFormatVersion: "ABC" as "1.0",
      },
      routes: {
        "GET /": "test/lambda.handler",
      },
    });
  }).toThrow(/PayloadFormatVersion/);
});

test("routes: ApiFunctionRouteProps cdk.function", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        cdk: {
          function: lambda.Function.fromFunctionArn(stack, "Fn", "arn:aws:lambda:us-east-1:123456789012:function:test-lambda"),
        },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  hasResource(stack, "AWS::ApiGatewayV2::Integration", {
    PayloadFormatVersion: "2.0",
    IntegrationType: "AWS_PROXY",
    IntegrationUri: "arn:aws:lambda:us-east-1:123456789012:function:test-lambda",
  });
});


test("routes: ApiAlbRouteProps method is undefined", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");

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
        type: "alb",
        cdk: {
          albListener: listener,
        },
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

test("routes: ApiAlbRouteProps method is HttpMethod", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");

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
        type: "alb",
        cdk: {
          albListener: listener,
          integration: {
            method: apig.HttpMethod.DELETE,
          },
        },
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
  const stack = new Stack(new App({ name: "api" }), "stack");

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        type: "url",
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

test("routes: ApiHttpRouteProps method is HttpMethod", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");

  new Api(stack, "Api", {
    routes: {
      "GET /": {
        type: "url",
        url: "https://domain.com",
        cdk: {
          integration: {
            method: apig.HttpMethod.DELETE,
          },
        },
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
  const stack = new Stack(new App({ name: "api" }), "stack");
  const api = new Api(stack, "Api", {});
  expect(api.routes).toEqual([]);
});

test("routes: has routes", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const api = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
      $default: "test/lambda.handler",
    },
  });
  expect(api.routes).toEqual(["GET /", "GET /2", "$default"]);
});

test("arn and api", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
  const api = new Api(stack, "Api", {});
  expect(api.httpApiId).toBeDefined();
  expect(api.httpApiArn).toBeDefined();

  const apiId = api.cdk.httpApi.apiId;
  const region = Stack.of(api).region;
  const partition = Stack.of(api).partition;

  expect(api.httpApiArn).toContain(
    `arn:${partition}:apigateway:${region}::/apis/${apiId}`
  );
});

///////////////////
// Test Methods
///////////////////

test("get-function", async () => {
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /")).toBeDefined();
});

test("get-function-multi-spaces", async () => {
  const app = new App({ name: "api" });
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
  const app = new App({ name: "api" });
  const stack = new Stack(app, "stack");
  const ret = new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /path")).toBeUndefined();
});

test("addRoutes-existing-route", async () => {
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const stack = new Stack(new App({ name: "api" }), "stack");
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
  const app = new App({ name: "api" });
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
