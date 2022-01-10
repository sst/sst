import {
  ABSENT,
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
  objectLike,
} from "aws-cdk-lib/assert";
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

///////////////////
// Test Constructor
///////////////////

test("constructor: restApi-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {});
  expect(api.url).toBeDefined();
  expect(api.customDomainUrl).toBeUndefined();
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
});

test("constructor: restApi-props", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    restApi: {
      description: "MyApi",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
      Description: "MyApi",
    })
  );
});

test("constructor: restApi-importedConstruct", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const api = new ApiGatewayV1Api(stackA, "StackAApi", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  new ApiGatewayV1Api(stackB, "StackBApi", { restApi: api.restApi });
  expectCdk(stackA).to(countResources("AWS::ApiGateway::RestApi", 1));
  expectCdk(stackA).to(countResources("AWS::ApiGateway::Deployment", 1));
  expectCdk(stackB).to(countResources("AWS::ApiGateway::RestApi", 0));
  expectCdk(stackB).to(countResources("AWS::ApiGateway::Deployment", 1));
});

test("constructor: restApi imported with importedPaths", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    importedPaths: {
      "/path": "xxxx",
    },
    routes: {
      "GET /path/new": "test/lambda.handler",
    },
    restApi: apig.RestApi.fromRestApiAttributes(stack, "IApi", {
      restApiId: "xxxx",
      rootResourceId: "xxxx",
    }),
  });
  expectCdk(stack).to(countResources("AWS::ApiGateway::Resource", 1));
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Resource", {
      PathPart: "new",
    })
  );
});

test("constructor: restApi not imported with importedPaths", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      importedPaths: {
        "/path": "xxxx",
      },
      routes: {
        "GET /": "test/lambda.handler",
      },
    });
  }).toThrow(/Cannot import route paths when creating a new API./);
});

test("cors-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api");
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGateway::Method", 1, {
      HttpMethod: "OPTIONS",
    })
  );
});

test("cors-true", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api");
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGateway::Method", 1, {
      HttpMethod: "OPTIONS",
    })
  );
});

test("cors-false", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    cors: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGateway::Method", 0, {
      HttpMethod: "OPTIONS",
    })
  );
});

test("cors-props", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    restApi: {
      defaultCorsPreflightOptions: {
        allowOrigins: ['"*"'],
      },
    },
  });
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGateway::Method", 1, {
      HttpMethod: "OPTIONS",
    })
  );
});

test("cors-redefined-in-restApi", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      cors: true,
      restApi: {
        defaultCorsPreflightOptions: {
          allowOrigins: ['"*"'],
        },
      },
    });
  }).toThrow(
    /Use either the "cors" or the "restApi.defaultCorsPreflightOptions" to configure the Api's CORS config./
  );
});

test("cors-restApi-imported", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      cors: true,
      restApi: apig.RestApi.fromRestApiAttributes(stack, "IApi", {
        restApiId: "xxxx",
        rootResourceId: "xxxx",
      }),
    });
  }).toThrow(/Cannot configure the "cors" when the "restApi" is imported/);
});

test("accessLog-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Stage", {
      AccessLogSetting: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format:
          '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","resourcePath":"$context.resourcePath","status":$context.status,"responseLatency":$context.responseLatency,"xrayTraceId":"$context.xrayTraceId","integrationRequestId":"$context.integration.requestId","functionResponseStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","principalId":"$context.authorizer.principalId"}',
      },
    })
  );
});

test("accessLog-true", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Stage", {
      AccessLogSetting: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format:
          '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","resourcePath":"$context.resourcePath","status":$context.status,"responseLatency":$context.responseLatency,"xrayTraceId":"$context.xrayTraceId","integrationRequestId":"$context.integration.requestId","functionResponseStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","principalId":"$context.authorizer.principalId"}',
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
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Stage", {
      AccessLogSetting: ABSENT,
    })
  );
});

test("accessLog-string", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: "$context.requestId",
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Stage", {
      AccessLogSetting: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format: "$context.requestId",
      },
    })
  );
});

test("accessLog-props", async () => {
  const stack = new Stack(new App(), "stack");
  new ApiGatewayV1Api(stack, "Api", {
    accessLog: {
      retention: "ONE_WEEK",
      format: "$context.requestId",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Stage", {
      AccessLogSetting: objectLike({
        Format: "$context.requestId",
      }),
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Logs::LogGroup", {
      RetentionInDays: logs.RetentionDays.ONE_WEEK,
    })
  );
});

test("accessLog-props-retention-invalid", async () => {
  const stack = new Stack(new App(), "stack");
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      accessLog: true,
      routes: {
        "GET /": "test/lambda.handler",
      },
      restApi: {
        deployOptions: {
          accessLogFormat: apig.AccessLogFormat.jsonWithStandardFields(),
        },
      },
    });
  }).toThrow(
    /Use either the "accessLog" or the "restApi.deployOptions.accessLogFormat" to configure the Api's access log./
  );
});

test("accessLog-restApi-imported", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      accessLog: true,
      restApi: apig.RestApi.fromRestApiAttributes(stack, "IApi", {
        restApiId: "xxxx",
        rootResourceId: "xxxx",
      }),
    });
  }).toThrow(/Cannot configure the "accessLog" when the "restApi" is imported/);
});

test("constructor: customDomain is string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
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
  expect(api.apiGatewayDomain).toBeDefined();
  expect(api.acmCertificate).toBeDefined();
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::DomainName", {
      DomainName: "api.domain.com",
      EndpointConfiguration: { Types: ["REGIONAL"] },
      RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::BasePathMapping", {
      DomainName: { Ref: "ApiDomainNameAC93F744" },
      BasePath: ABSENT,
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

test("constructor: customDomain is string (uppercase error)", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: "API.domain.com",
    });
  }).toThrow(/The domain name needs to be in lowercase/);
});

test("constructor: customDomain is string (imported ssm)", async () => {
  const stack = new Stack(new App(), "stack");
  const domain = ssm.StringParameter.valueForStringParameter(stack, "domain");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: domain,
    });
  }).toThrow(
    /You also need to specify the "hostedZone" if the "domainName" is passed in as a reference./
  );
});

test("constructor: customDomain is props-domainName-string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
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
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::DomainName", {
      DomainName: "api.domain.com",
      EndpointConfiguration: { Types: ["REGIONAL"] },
      RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::BasePathMapping", {
      DomainName: { Ref: "ApiDomainNameAC93F744" },
      BasePath: "users",
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

test("constructor: customDomain.domainName is string (uppercase error)", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
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
    new ApiGatewayV1Api(stack, "Api", {
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
  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: domain,
      hostedZone: "domain.com",
    },
  });

  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::DomainName", {
      DomainName: {
        Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
      },
      EndpointConfiguration: { Types: ["REGIONAL"] },
      RegionalCertificateArn: { Ref: "ApiCertificate285C31EB" },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::CertificateManager::Certificate", {
      DomainName: {
        Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Route53::RecordSet", {
      Name: {
        Ref: "SsmParameterValuedomainC96584B6F00A464EAD1953AFF4B05118Parameter",
      },
      Type: "A",
    })
  );
});

test("constructor: customDomain is props-domainName-edge", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: "api.domain.com",
      hostedZone: "api.domain.com",
      path: "users",
      endpointType: apig.EndpointType.EDGE,
    },
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::DomainName", {
      DomainName: "api.domain.com",
      EndpointConfiguration: { Types: ["EDGE"] },
      CertificateArn: {
        "Fn::GetAtt": [
          "ApiCrossRegionCertificateCertificateRequestorResource0E9C02A0",
          "Arn",
        ],
      },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::BasePathMapping", {
      DomainName: { Ref: "ApiDomainNameAC93F744" },
      BasePath: "users",
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

test("constructor: customDomain is props-hostedZone-generated-from-minimal-domainName", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
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
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("constructor: customDomain is props-hostedZone-generated-from-full-domainName", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = jest
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
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("constructor: customDomain is restApi-imported", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      restApi: new apig.RestApi(stack, "RestApi"),
    });
  }).toThrow(
    /Cannot configure the "customDomain" when the "restApi" is imported/
  );
});

test("constructor: customDomain is props-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: "api.domain.com",
      routes: {
        "GET /": "test/lambda.handler",
      },
      restApi: {
        domainName: {
          domainName: "api.domain.com",
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "api.domain.com",
          }),
        },
      },
    });
  }).toThrow(
    /Use either the "customDomain" or the "restApi.domainName" to configure the Api domain./
  );
});

test("constructor: customDomain is props-domainName-apigDomainName", async () => {
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

  new ApiGatewayV1Api(stack, "Api", {
    customDomain: {
      domainName: apig.DomainName.fromDomainNameAttributes(
        stack,
        "DomainName",
        {
          domainName: "name",
          domainNameAliasHostedZoneId: "id",
          domainNameAliasTarget: "target",
        }
      ) as apig.DomainName,
      path: "users",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::DomainName", {
      DomainName: "api.domain.com",
      EndpointConfiguration: { Types: ["REGIONAL"] },
      RegionalCertificateArn: { Ref: "Cert5C9FAEC1" },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::BasePathMapping", {
      DomainName: { Ref: "DomainNameEC95A6E9" },
      BasePath: "users",
    })
  );
  expectCdk(stack).to(
    countResources("AWS::CertificateManager::Certificate", 1)
  );
  expectCdk(stack).to(countResources("AWS::Route53::RecordSet", 0));
  expectCdk(stack).to(countResources("AWS::Route53::HostedZone", 0));
});

test("constructor: customDomain is props-domainName-apigDomainName-hostedZone-redefined-error", async () => {
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
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
        domainName: apig.DomainName.fromDomainNameAttributes(
          stack,
          "DomainName",
          {
            domainName: "name",
            domainNameAliasHostedZoneId: "id",
            domainNameAliasTarget: "target",
          }
        ) as apig.DomainName,
        hostedZone: "domain.com",
      },
    });
  }).toThrow(
    /Cannot configure the "hostedZone" when the "domainName" is a construct/
  );
});

test("constructor: customDomain is props-domainName-apigDomainName-certificate-redefined-error", async () => {
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
    new ApiGatewayV1Api(stack, "Api", {
      customDomain: {
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
    });
  }).toThrow(
    /Cannot configure the "certificate" when the "domainName" is a construct/
  );
});

test("defaultAuthorizationType-iam", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: apig.AuthorizationType.IAM,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "AWS_IAM",
    })
  );
});

test("defaultAuthorizationType-custom", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apig.AuthorizationType.CUSTOM,
    defaultAuthorizer: new apig.RequestAuthorizer(stack, "MyAuthorizer", {
      handler: f,
      identitySources: [apig.IdentitySource.header("Authorization")],
    }),
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "CUSTOM",
      AuthorizerId: { Ref: "MyAuthorizer6575980E" },
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Authorizer", {
      Type: "REQUEST",
      IdentitySource: "method.request.header.Authorization",
    })
  );
});

test("defaultAuthorizationType-cognito", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool");
  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apig.AuthorizationType.COGNITO,
    defaultAuthorizer: new apig.CognitoUserPoolsAuthorizer(
      stack,
      "MyAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    ),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "COGNITO_USER_POOLS",
      AuthorizerId: { Ref: "MyAuthorizer6575980E" },
      AuthorizationScopes: ["user.id", "user.email"],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Authorizer", {
      Type: "COGNITO_USER_POOLS",
      IdentitySource: "method.request.header.Authorization",
    })
  );
});

test("defaultAuthorizationType-none", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: apig.AuthorizationType.NONE,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "NONE",
    })
  );
});

test("defaultAuthorizationType-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "NONE",
    })
  );
});

test("routes-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api");
  expectCdk(stack).to(countResources("AWS::ApiGateway::RestApi", 1));
  expectCdk(stack).to(countResources("AWS::ApiGateway::Method", 1));
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGateway::Method", 1, {
      HttpMethod: "OPTIONS",
    })
  );
});

test("routes-empty", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {},
  });
  expectCdk(stack).to(countResources("AWS::ApiGateway::RestApi", 1));
  expectCdk(stack).to(countResources("AWS::ApiGateway::Method", 1));
  expectCdk(stack).to(
    countResourcesLike("AWS::ApiGateway::Method", 1, {
      HttpMethod: "OPTIONS",
    })
  );
});

test("route-invalid", async () => {
  const app = new App();
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
  const app = new App();
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
  const app = new App();
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
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-string-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": f,
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
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      routes: {
        "GET /": f,
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("route-FunctionProps-empty", async () => {
  const app = new App();
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

test("route-FunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": {
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
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": {
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
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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
  new ApiGatewayV1Api(stack, "Api", {
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

test("route-ApiRouteProps-function-string", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-ApiRouteProps-function-string-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
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

test("route-ApiRouteProps-function-Function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": { function: f },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-ApiRouteProps-function-Function-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new ApiGatewayV1Api(stack, "Api", {
      routes: {
        "GET /": { function: f },
      },
      defaultFunctionProps: {
        timeout: 3,
      },
    });
  }).toThrow(/The "defaultFunctionProps" cannot be applied/);
});

test("route-ApiRouteProps-function-FunctionProps", async () => {
  const app = new App();
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("route-ApiRouteProps-function-FunctionProps-with-defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 3,
    })
  );
});

test("route-ApiRouteProps-function-FunctionProps-with-defaultFunctionProps-override", async () => {
  const app = new App();
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
    defaultFunctionProps: {
      timeout: 3,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 5,
    })
  );
});

test("route-ApiRouteProps-methodOptions-override-authorizationType-CUSTOM-by-NONE", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apig.AuthorizationType.CUSTOM,
    defaultAuthorizer: new apig.RequestAuthorizer(stack, "MyAuthorizer", {
      handler: f,
      identitySources: [apig.IdentitySource.header("Authorization")],
    }),
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        methodOptions: {
          authorizationType: apig.AuthorizationType.NONE,
        },
      },
      "GET /2": {
        function: "test/lambda.handler",
        methodOptions: {
          authorizationType: apig.AuthorizationType.CUSTOM,
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "NONE",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "CUSTOM",
    })
  );
});

test("route-ApiRouteProps-methodOptions-override-authorizationType-IAM-by-NONE", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apig.AuthorizationType.IAM,
    routes: {
      "GET /": {
        function: {
          handler: "test/lambda.handler",
        },
        methodOptions: {
          authorizationType: apig.AuthorizationType.NONE,
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "NONE",
    })
  );
});

test("route-ApiRouteProps-methodOptions-override-authorizationType-NONE-by-IAM", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apig.AuthorizationType.NONE,
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        methodOptions: {
          authorizationType: apig.AuthorizationType.IAM,
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      AuthorizationType: "AWS_IAM",
    })
  );
});

test("route-ApiRouteProps-integrationOptions", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apig.AuthorizationType.NONE,
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        integrationOptions: {
          requestParameters: { a: "b" },
        },
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      Integration: objectLike({
        RequestParameters: { a: "b" },
      }),
    })
  );
});

///////////////////
// Test Properties
///////////////////

test("routes: no routes", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {});
  expect(api.routes).toEqual([]);
});

test("routes: has routes", async () => {
  const stack = new Stack(new App(), "stack");
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
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /")).toBeDefined();
});

test("get-function-multi-spaces", async () => {
  const app = new App();
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
  const app = new App();
  const stack = new Stack(app, "stack");
  const ret = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expect(ret.getFunction("GET /path")).toBeUndefined();
});

test("addRoutes-existing-route", async () => {
  const stack = new Stack(new App(), "stack");
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
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  api.attachPermissions(["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
    })
  );
});

test("attachPermissionsToRoute", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
      "GET /2": "test/lambda.handler",
    },
  });
  api.attachPermissionsToRoute("GET /", ["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy],
        Version: "2012-10-17",
      },
      PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
    })
  );
});

test("attachPermissions-after-addRoutes", async () => {
  const app = new App();
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
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "ApiLambdaGETServiceRoleDefaultPolicy013A8DEA",
    })
  );
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "ApiLambdaGET2ServiceRoleDefaultPolicy934FD89B",
    })
  );
  expectCdk(stackB).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "LambdaGET3ServiceRoleDefaultPolicy21DC01C7",
    })
  );
});
