import { test, expect, vi, beforeEach } from "vitest";
import {
  ANY,
  ABSENT,
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
} from "./helper";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as logs from "aws-cdk-lib/aws-logs";
import { App, Stack, ApiGatewayV1Api, Function } from "../src";

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

test("constructor: restApi-undefined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {});
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
  expect(api.restApiArn).toBeDefined();
  expect(api.restApiId).toBeDefined();
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
});

test("constructor: restApi-props", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    cdk: {
      restApi: {
        restApiName: "MyApiName",
        description: "MyApiDescription",
      },
    },
  });
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "MyApiName",
    Description: "MyApiDescription",
  });
});

test("constructor: restApi-importedConstruct", async () => {
  const app = new App({ name: "apiv1" });
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new ApiGatewayV1Api(stackA, "StackAApi", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  new ApiGatewayV1Api(stackB, "StackBApi", {
    cdk: {
      restApi: api.cdk.restApi,
    },
  });
  countResources(stackA, "AWS::ApiGateway::RestApi", 1);
  countResources(stackA, "AWS::ApiGateway::Deployment", 1);
  countResources(stackB, "AWS::ApiGateway::RestApi", 0);
  countResources(stackB, "AWS::ApiGateway::Deployment", 1);
});

test("constructor: restApi imported with importedPaths", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    cdk: {
      restApi: apig.RestApi.fromRestApiAttributes(stack, "IApi", {
        restApiId: "xxxx",
        rootResourceId: "xxxx",
      }),
      importedPaths: {
        "/path": "xxxx",
      },
    },
    routes: {
      "GET /path/new": "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::ApiGateway::Resource", 1);
  hasResource(stack, "AWS::ApiGateway::Resource", {
    PathPart: "new",
  });
});

test("constructor: restApi not imported with importedPaths", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      cdk: {
        importedPaths: {
          "/path": "xxxx",
        },
      },
      routes: {
        "GET /": "test/lambda.handler",
      },
    });
  }).toThrow(/Cannot import route paths when creating a new API./);
});

test("cors-undefined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api");
  countResourcesLike(stack, "AWS::ApiGateway::Method", 1, {
    HttpMethod: "OPTIONS",
    Integration: objectLike({
      IntegrationResponses: [
        objectLike({
          ResponseParameters: {
            "method.response.header.Access-Control-Allow-Headers": "'*'",
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'"
          },
        })
      ],
    }),
  });
});

test("cors-true", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api");
  countResourcesLike(stack, "AWS::ApiGateway::Method", 1, {
    HttpMethod: "OPTIONS",
    Integration: objectLike({
      IntegrationResponses: [
        objectLike({
          ResponseParameters: {
            "method.response.header.Access-Control-Allow-Headers": "'*'",
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET,PUT,POST,DELETE,PATCH,HEAD'"
          },
        })
      ],
    }),
  });
});

test("cors-false", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    cors: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  countResourcesLike(stack, "AWS::ApiGateway::Method", 0, {
    HttpMethod: "OPTIONS",
  });
});

test("cors-cdk.props", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    cdk: {
      restApi: {
        defaultCorsPreflightOptions: {
          allowOrigins: ['"*"'],
        },
      },
    },
  });
  countResourcesLike(stack, "AWS::ApiGateway::Method", 1, {
    HttpMethod: "OPTIONS",
  });
});

test("cors-redefined-in-restApi", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      cors: true,
      cdk: {
        restApi: {
          defaultCorsPreflightOptions: {
            allowOrigins: ['"*"'],
          },
        },
      },
    });
  }).toThrow(
    /Use either the "cors" or the "restApi.defaultCorsPreflightOptions" to configure the Api's CORS config./
  );
});

test("cors-restApi-imported", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      cors: true,
      cdk: {
        restApi: apig.RestApi.fromRestApiAttributes(stack, "IApi", {
          restApiId: "xxxx",
          rootResourceId: "xxxx",
        }),
      },
    });
  }).toThrow(/Cannot configure the "cors" when the "restApi" is imported/);
});

test("accessLog-undefined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Stage", {
    AccessLogSetting: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","resourcePath":"$context.resourcePath","status":$context.status,"responseLatency":$context.responseLatency,"xrayTraceId":"$context.xrayTraceId","integrationRequestId":"$context.integration.requestId","functionResponseStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","principalId":"$context.authorizer.principalId"}',
    },
  });
});

test("accessLog-true", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Stage", {
    AccessLogSetting: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format:
        '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","resourcePath":"$context.resourcePath","status":$context.status,"responseLatency":$context.responseLatency,"xrayTraceId":"$context.xrayTraceId","integrationRequestId":"$context.integration.requestId","functionResponseStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","principalId":"$context.authorizer.principalId"}',
    },
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    RetentionInDays: ABSENT,
  });
});

test("accessLog-false", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Stage", {
    AccessLogSetting: ABSENT,
  });
});

test("accessLog-string", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: "$context.requestId",
  });
  hasResource(stack, "AWS::ApiGateway::Stage", {
    AccessLogSetting: {
      DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
      Format: "$context.requestId",
    },
  });
});

test("accessLog-props", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: {
      retention: "one_week",
      format: "$context.requestId",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Stage", {
    AccessLogSetting: objectLike({
      Format: "$context.requestId",
    }),
  });
  hasResource(stack, "AWS::Logs::LogGroup", {
    RetentionInDays: logs.RetentionDays.ONE_WEEK,
  });
});

test("accessLog-props-retention-invalid", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      accessLog: {
        // @ts-ignore Allow non-existant value
        retention: "NOT_EXIST",
      },
    });
  }).toThrow(/Invalid access log retention value "NOT_EXIST"./);
});

test("accessLog-redefined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      cdk: {
        restApi: {
          deployOptions: {
            accessLogFormat: apig.AccessLogFormat.jsonWithStandardFields(),
          },
        },
      },
    });
  }).toThrow(
    /Use either the "accessLog" or the "restApi.deployOptions.accessLogFormat" to configure the Api's access log./
  );
});

test("accessLog-restApi-imported", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      accessLog: true,
      cdk: {
        restApi: apig.RestApi.fromRestApiAttributes(stack, "IApi", {
          restApiId: "xxxx",
          rootResourceId: "xxxx",
        }),
      },
    });
  }).toThrow(/Cannot configure the "accessLog" when the "restApi" is imported/);
});

test("customDomain: string", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new ApiGatewayV1Api(stack, "Api", {
    customDomain: "api.domain.com",
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(api.customDomainUrl).toBeDefined();
  expect(api.cdk.domainName).toBeDefined();
  expect(api.cdk.certificate).toBeDefined();
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: "api.domain.com",
    EndpointConfiguration: { Types: ["REGIONAL"] },
    RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
  });
  hasResource(stack, "AWS::ApiGateway::BasePathMapping", {
    DomainName: { Ref: "ApiDomainNameAC93F744" },
    BasePath: ABSENT,
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
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: "API.domain.com",
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain: string (imported ssm)", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: domain,
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("customDomain: string: hostedZone generated from minimal domainName", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new ApiGatewayV1Api(stack, "Api", {
    customDomain: "api.domain.com",
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
});

test("customDomain: internal domain: domainName is string", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const api = new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
      path: "users",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(api.customDomainUrl).toBeDefined();
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: "api.domain.com",
    EndpointConfiguration: { Types: ["REGIONAL"] },
    RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
  });
  hasResource(stack, "AWS::ApiGateway::BasePathMapping", {
    DomainName: { Ref: "ApiDomainNameAC93F744" },
    BasePath: "users",
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
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
        domainName: "API.domain.com",
      },
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("customDomain: internal domain: domainName is string (imported ssm), hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: domain,
      hostedZone: "domain.com",
    },
  });

  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
    EndpointConfiguration: { Types: ["REGIONAL"] },
    RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
  });
  hasResource(stack, "AWS::CertificateManager::Certificate", {
    DomainName: {
      Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
    },
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

test("customDomain: internal domain: domainName is string (imported ssm), cdk.hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: domain,
      cdk: {
        hostedZone: new route53.HostedZone(stack, "Zone", {
          zoneName: "domain.com",
        }),
      }
    },
  });

  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: {
      Ref: ANY,
    },
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: {
      Ref: ANY,
    },
    Type: "A",
  });
});

test("customDomain: internal domain: domainName is string, cdk.hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation(() => {
      // If cdk.hostedZone is provided that should be used and no lookup should be required
      throw new Error('No hosted zone should be looked up');
    });
  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: 'api.domain.com',
      cdk: {
        hostedZone: new route53.HostedZone(stack, "Zone", {
          zoneName: "domain.com",
        }),
      }
    },
  });

  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: "api.domain.com",
    EndpointConfiguration: { Types: ["REGIONAL"] },
    RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
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

test("customDomain: internal domain: domainName is string, hostedZone is string, cdk.hostedZone defined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
        domainName: "api.domain.com",
        hostedZone: 'domain.com',
        cdk: {
          hostedZone: new route53.HostedZone(stack, "Zone", {
            zoneName: "domain.com",
          }),
        }
      },
    });
  }).toThrow(/Use either the "customDomain.hostedZone" or the "customDomain.cdk.hostedZone"/);
});

test("customDomain: internal domain: domainName is string (imported ssm), hostedZone undefined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
        domainName: domain,
      },
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("customDomain: internal domain: domainName is type edge", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
      path: "users",
      endpointType: "edge",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: "api.domain.com",
    EndpointConfiguration: { Types: ["EDGE"] },
    CertificateArn: {
      "Fn::GetAtt": [
        "ApiCrossRegionCertificateCertificateRequestorResource0E9C02A0",
        "Arn",
      ],
    },
  });
  hasResource(stack, "AWS::ApiGateway::BasePathMapping", {
    DomainName: { Ref: "ApiDomainNameAC93F744" },
    BasePath: "users",
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

test("customDomain: internal domain: hostedZone generated from full domainName", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
});

test("customDomain is restApi-imported", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      cdk: {
        restApi: new apig.RestApi(stack, "RestApi"),
      },
    });
  }).toThrow(
    /Cannot configure the "customDomain" when the "restApi" is imported/
  );
});

test("customDomain is props-redefined", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      cdk: {
        restApi: {
          domainName: {
            domainName: "api.domain.com",
            certificate: new acm.Certificate(stack, "Cert", {
              domainName: "api.domain.com",
            }),
          },
        },
      },
    });
  }).toThrow(
    /Use either the "customDomain" or the "restApi.domainName" to configure the Api domain./
  );
});

test("customDomain is props-domainName-apigDomainName", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
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

  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      cdk: {
        domainName: apig.DomainName.fromDomainNameAttributes(
          stack,
          "DomainName",
          {
            domainName: "name",
            domainNameAliasHostedZoneId: "id",
            domainNameAliasTarget: "target",
          }
        ) as apig.DomainName,
      },
      path: "users",
    },
  });
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::DomainName", {
    DomainName: "api.domain.com",
    EndpointConfiguration: { Types: ["REGIONAL"] },
    RegionalCertificateArn: { Ref: "Cert5C9FAEC1" },
  });
  hasResource(stack, "AWS::ApiGateway::BasePathMapping", {
    DomainName: { Ref: "DomainNameEC95A6E9" },
    BasePath: "users",
  });
  countResources(stack, "AWS::CertificateManager::Certificate", 1);
  countResources(stack, "AWS::Route53::RecordSet", 0);
});

test("customDomain: cdk.domainName and hostedZone co-exist error", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
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
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
        cdk: {
          domainName: apig.DomainName.fromDomainNameAttributes(
            stack,
            "DomainName",
            {
              domainName: "name",
              domainNameAliasHostedZoneId: "id",
              domainNameAliasTarget: "target",
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

test("customDomain: cdk.domainName and cdk.hostedZone co-exist error", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
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
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
        cdk: {
          domainName: apig.DomainName.fromDomainNameAttributes(
            stack,
            "DomainName",
            {
              domainName: "name",
              domainNameAliasHostedZoneId: "id",
              domainNameAliasTarget: "target",
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

test("defaultAuthorizationType-iam", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaults: {
      authorizer: "iam",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "AWS_IAM",
  });
});

test("defaultAuthorizationType-lambda_token", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      MyAuthorizer: {
        type: "lambda_token",
        function: f,
        identitySources: [apig.IdentitySource.header("Authorization")],
      },
    },
    defaults: {
      authorizer: "MyAuthorizer",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "CUSTOM",
    AuthorizerId: { Ref: "ApiMyAuthorizer6B7BC41E" },
  });
  hasResource(stack, "AWS::ApiGateway::Authorizer", {
    Type: "TOKEN",
    IdentitySource: "method.request.header.Authorization",
  });
});

test("defaultAuthorizationType-lambda_request", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      MyAuthorizer: {
        type: "lambda_request",
        function: f,
        identitySources: [apig.IdentitySource.header("Authorization")],
      },
    },
    defaults: {
      authorizer: "MyAuthorizer",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "CUSTOM",
    AuthorizerId: { Ref: "ApiMyAuthorizer6B7BC41E" },
  });
  hasResource(stack, "AWS::ApiGateway::Authorizer", {
    Type: "REQUEST",
    IdentitySource: "method.request.header.Authorization",
  });
});

test("defaultAuthorizationType-user_pools", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool");
  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      MyAuthorizer: {
        type: "user_pools",
        userPoolIds: [userPool.userPoolId],
      },
    },
    defaults: {
      authorizer: "MyAuthorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::RestApi", {
    Name: "dev-apiv1-Api",
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: { Ref: "ApiMyAuthorizer6B7BC41E" },
    AuthorizationScopes: ["user.id", "user.email"],
  });
  hasResource(stack, "AWS::ApiGateway::Authorizer", {
    Type: "COGNITO_USER_POOLS",
    IdentitySource: "method.request.header.Authorization",
  });
});

test("defaultAuthorizationType-none", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    defaults: {
      authorizer: "none",
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "NONE",
  });
});

test("defaultAuthorizationType-default", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "NONE",
  });
});

test("routes-undefined", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api");
  countResources(stack, "AWS::ApiGateway::RestApi", 1);
  countResources(stack, "AWS::ApiGateway::Method", 1);
  countResourcesLike(stack, "AWS::ApiGateway::Method", 1, {
    HttpMethod: "OPTIONS",
  });
});

test("routes-empty", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {},
  });
  countResources(stack, "AWS::ApiGateway::RestApi", 1);
  countResources(stack, "AWS::ApiGateway::Method", 1);
  countResourcesLike(stack, "AWS::ApiGateway::Method", 1, {
    HttpMethod: "OPTIONS",
  });
});

test("route-invalid", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      routes: {
        "GET / 1 2 3": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid route GET \/ 1 2 3/);
});

test("route-invalid-method", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      routes: {
        "GARBAGE /": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid method defined for "GARBAGE \/"/);
});

test("route-invalid-path", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      routes: {
        "GET ": "test/lambda.handler",
      },
    });
  }).toThrow(/Invalid path defined for "GET "/);
});

test("route-string", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("route-string-with-defaults.function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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

test("route-Function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": f,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("route-Function-with-defaults.function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
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

test("route-FunctionProps-empty", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      routes: {
        "GET /": {
          function: {},
        },
      },
    });
  }).toThrow(/Invalid function definition/);
});

test("route-ApiRouteProps-function-string", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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

test("route-ApiRouteProps-function-string-with-defaults.function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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

test("route-ApiRouteProps-function-Function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": { function: f },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("route-ApiRouteProps-function-Function-with-defaults.function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
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

test("route-ApiRouteProps-function-FunctionProps", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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

test("route-ApiRouteProps-function-FunctionProps-with-defaults.function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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

test("route-ApiRouteProps-function-FunctionProps-with-defaults.function-override", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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

test("routes: authorizer lambda_request override by none", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      MyAuthorizer: {
        type: "lambda_request",
        function: f,
        identitySources: [apig.IdentitySource.header("Authorization")],
      },
    },
    defaults: {
      authorizer: "MyAuthorizer",
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizer: "none",
      },
      "GET /2": {
        function: "test/lambda.handler",
        authorizer: "MyAuthorizer",
      },
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "NONE",
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    HttpMethod: "GET",
    AuthorizationType: "CUSTOM",
  });
});

test("routes: authorizer iam override by none", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "NONE",
  });
});

test("routes: authorizer none override by iam", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    defaults: {
      authorizer: "none",
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizer: "iam",
      },
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "AWS_IAM",
  });
});

test("routes: authorizationScopes override", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      MyAuthorizer: {
        type: "user_pools",
        userPoolIds: [
          "arn:aws:cognito-idp:us-east-1:123412341234:userpool/us-east-1_123412341",
        ],
      },
    },
    defaults: {
      authorizer: "MyAuthorizer",
      authorizationScopes: ["user.name"],
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizationScopes: ["user.id"],
      },
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    AuthorizationType: "COGNITO_USER_POOLS",
    AuthorizerId: { Ref: "ApiMyAuthorizer6B7BC41E" },
    AuthorizationScopes: ["user.id"],
  });
});

test("route-ApiRouteProps-integrationOptions", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    defaults: {
      authorizer: "none",
    },
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        cdk: {
          integration: {
            requestParameters: { a: "b" },
          },
        },
      },
    },
  });
  hasResource(stack, "AWS::ApiGateway::Method", {
    Integration: objectLike({
      RequestParameters: { a: "b" },
    }),
  });
});

///////////////////
// Test Properties
///////////////////

test("routes: no routes", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {});
  expect(api.routes).toEqual([]);
});

test("routes: has routes", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  expect(api.routes).toEqual(["GET /", "GET /2"]);
});

///////////////////
// Test Methods
///////////////////

test("get-function", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const ret = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /")).toBeDefined();
});

test("get-function-multi-spaces", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const ret = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET  /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /")).toBeDefined();
  expect(ret.getFunction("GET  /")).toBeDefined();
});

test("get-function-undefined", async () => {
  const app = new App({ name: "apiv1" });
  const stack = new Stack(app, "stack");
  const ret = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /path")).toBeUndefined();
});

test("addRoutes-existing-route", async () => {
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
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
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
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
  const stack = new Stack(new App({ name: "apiv1" }), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
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
  const app = new App({ name: "apiv1" });
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new ApiGatewayV1Api(stackA, "Api", {
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
