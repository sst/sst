import {
  ABSENT,
  expect as expectCdk,
  countResources,
  haveResource,
} from "@aws-cdk/assert";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as apigAuthorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import * as cognito from "@aws-cdk/aws-cognito";
import * as route53 from "@aws-cdk/aws-route53";
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

test("httpApi-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {});
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
});

test("httpApi-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    httpApi: {
      disableExecuteApiEndpoint: true,
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
      DisableExecuteApiEndpoint: true,
    })
  );
});

test("httpApi-apigHttpApiProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    httpApi: new apig.HttpApi(stack, "MyHttpApi", {
      apiName: "existing-api",
    }),
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "existing-api",
    })
  );
});

test("cors-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: true,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: {
        AllowHeaders: ["*"],
        AllowMethods: ["*"],
        AllowOrigins: ["*"],
      },
    })
  );
});

test("cors-true", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: true,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: {
        AllowHeaders: ["*"],
        AllowMethods: ["*"],
        AllowOrigins: ["*"],
      },
    })
  );
});

test("cors-false", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: false,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: ABSENT,
    })
  );
});

test("cors-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    cors: {
      allowMethods: [apig.CorsHttpMethod.GET],
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: {
        AllowMethods: ["GET"],
      },
    })
  );
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
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format:
          '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","routeKey":"$context.routeKey","status":$context.status,"responseLatency":$context.responseLatency,"integrationRequestId":"$context.integration.requestId","integrationStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
      },
    })
  );
});

test("accessLog-true", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: true,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: {
        DestinationArn: { "Fn::GetAtt": ["ApiLogGroup1717FE17", "Arn"] },
        Format:
          '{"requestTime":"$context.requestTime","requestId":"$context.requestId","httpMethod":"$context.httpMethod","path":"$context.path","routeKey":"$context.routeKey","status":$context.status,"responseLatency":$context.responseLatency,"integrationRequestId":"$context.integration.requestId","integrationStatus":"$context.integration.status","integrationLatency":"$context.integration.latency","integrationServiceStatus":"$context.integration.integrationStatus","ip":"$context.identity.sourceIp","userAgent":"$context.identity.userAgent","cognitoIdentityId":"$context.identity.cognitoIdentityId"}',
      },
    })
  );
});

test("accessLog-false", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    accessLog: false,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Stage", {
      AccessLogSettings: ABSENT,
    })
  );
});

test("accessLog-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
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

test("accessLog-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
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

test("customDomain-string", async () => {
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
      DomainName: "api.domain.com",
      Stage: "$default",
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
      DomainName: "api.domain.com",
      Stage: "$default",
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

  new Api(stack, "Api", {
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

test("customDomain-props-hostedZone-generated-from-full-domainName", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Route53::HostedZone", {
      Name: "domain.com.",
    })
  );
});

test("customDomain-props-redefined", async () => {
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
      DomainName: "api.domain.com",
      Stage: "$default",
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
    /sst.Api does not currently support ABC. Only "AWS_IAM" and "JWT" are currently supported./
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
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "AWS_IAM",
    })
  );
});

test("defaultAuthorizationType-JWT-userpool", async () => {
  const stack = new Stack(new App(), "stack");
  const userPool = new cognito.UserPool(stack, "UserPool");
  const userPoolClient = userPool.addClient("UserPoolClient");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpUserPoolAuthorizer({
      userPool,
      userPoolClient,
    }),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "JWT",
      AuthorizerId: { Ref: "ApiUserPoolAuthorizer6F4D9292" },
      AuthorizationScopes: ["user.id", "user.email"],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Authorizer", {
      Name: "UserPoolAuthorizer",
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
    })
  );
});

test("defaultAuthorizationType-JWT-auth0", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer({
      jwtAudience: ["123"],
      jwtIssuer: "https://abc.us.auth0.com",
    }),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Api", {
      Name: "dev-my-app-Api",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "JWT",
      AuthorizerId: { Ref: "ApiJwtAuthorizer32F43CA9" },
      AuthorizationScopes: ["user.id", "user.email"],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Authorizer", {
      Name: "JwtAuthorizer",
      AuthorizerType: "JWT",
      IdentitySource: ["$request.header.Authorization"],
      JwtConfiguration: {
        Audience: ["123"],
        Issuer: "https://abc.us.auth0.com",
      },
    })
  );
});

test("defaultAuthorizationType-jwt-missing-authorizer", async () => {
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

test("defaultAuthorizationType-none", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
    defaultAuthorizationType: ApiAuthorizationType.NONE,
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "NONE",
    })
  );
});

test("defaultAuthorizationType-default", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "NONE",
    })
  );
});

test("routes-undefined", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api");
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Api", 1));
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 0));
});

test("routes-empty", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {},
  });
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Api", 1));
  expectCdk(stack).to(countResources("AWS::ApiGatewayV2::Route", 0));
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

test("route-string", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("route-string-with-defaultFunctionProps", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
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
  new Api(stack, "Api", {
    routes: {
      "GET /": f,
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("route-Function-with-defaultFunctionProps", async () => {
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

test("route-FunctionProps-empty", async () => {
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

test("route-FunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        handler: "test/lambda.handler",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("route-FunctionProps-with-defaultFunctionProps", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("route-FunctionProps-with-defaultFunctionProps-override", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
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
  new Api(stack, "Api", {
    routes: {
      "GET /": {
        function: "test/lambda.handler",
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("route-ApiRouteProps-function-string-with-defaultFunctionProps", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("route-ApiRouteProps-function-Function", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  new Api(stack, "Api", {
    routes: {
      "GET /": { function: f },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("route-ApiRouteProps-function-Function-with-defaultFunctionProps", async () => {
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

test("route-ApiRouteProps-function-FunctionProps", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
});

test("route-ApiRouteProps-function-FunctionProps-with-defaultFunctionProps", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 3,
    })
  );
});

test("route-ApiRouteProps-function-FunctionProps-with-defaultFunctionProps-override", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
      Timeout: 5,
    })
  );
});

test("route-ApiRouteProps-authorizationType-invalid", async () => {
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
    /sst.Api does not currently support ABC. Only "AWS_IAM" and "JWT" are currently supported./
  );
});

test("route-ApiRouteProps-authorizationType-override-AWSIAM-by-NONE", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "NONE",
    })
  );
});

test("route-ApiRouteProps-authorizationType-override-JWT-by-NONE", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer({
      jwtAudience: ["123"],
      jwtIssuer: "https://abc.us.auth0.com",
    }),
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizationType: ApiAuthorizationType.NONE,
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "NONE",
    })
  );
});

test("route-ApiRouteProps-authorizationType-override-JWT-by-JWT", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: new apigAuthorizers.HttpJwtAuthorizer({
      jwtAudience: ["123"],
      jwtIssuer: "https://abc.us.auth0.com",
    }),
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /": {
        function: "test/lambda.handler",
        authorizationType: ApiAuthorizationType.JWT,
        authorizer: new apigAuthorizers.HttpJwtAuthorizer({
          jwtAudience: ["234"],
          jwtIssuer: "https://xyz.us.auth0.com",
        }),
        authorizationScopes: ["user.profile"],
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Route", {
      AuthorizationType: "JWT",
      AuthorizerId: { Ref: "ApiJwtAuthorizer32F43CA9" },
      AuthorizationScopes: ["user.profile"],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Authorizer", {
      Name: "JwtAuthorizer",
      AuthorizerType: "JWT",
      IdentitySource: ["$request.header.Authorization"],
      JwtConfiguration: {
        Audience: ["234"],
        Issuer: "https://xyz.us.auth0.com",
      },
    })
  );
});

test("route-ApiRouteProps-payloadFormatVersion-default", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Integration", {
      PayloadFormatVersion: "2.0",
    })
  );
});

test("route-ApiRouteProps-payloadFormatVersion-v1", async () => {
  const stack = new Stack(new App(), "stack");
  new Api(stack, "Api", {
    defaultPayloadFormatVersion: ApiPayloadFormatVersion.V1,
    routes: {
      "GET /": "test/lambda.handler",
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Integration", {
      PayloadFormatVersion: "1.0",
    })
  );
});

test("route-ApiRouteProps-payloadFormatVersion-v2-override-by-v1", async () => {
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
  expectCdk(stack).to(
    haveResource("AWS::ApiGatewayV2::Integration", {
      PayloadFormatVersion: "1.0",
    })
  );
});

test("route-ApiRouteProps-payloadFormatVersion-invalid", async () => {
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
  const api = new Api(stack, "Api", {
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
