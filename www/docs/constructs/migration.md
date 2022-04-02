---
title: Migrate to v1.0
description: "Docs for the constructs in the @serverless-stack/resources package"
---

The v1 constructs were restrucrtured with the following goals in mind:
1. Consistent interface for customizing underlying AWS resources.
1. Consistent interface to underlying AWS resource name and ARNs via properties.
1. Reduce the need to import CDK libraries.
1. Typesafey
1. Full support for inline TS Doc.

## App Changelog
- app.setDefaultRemovalPolicy(): parameter type `cdk.RemovalPolicy` ⇒ `"destroy" | "retain" | "snapshot"`

  ```js
  // from
  app.setDefaultRemovalPolicy(cdk.RemovalPolicy.DESTROY);
  // to
  app.setDefaultRemovalPolicy("destroy");
  ```

## Permissions Changelog
- Type `PermissionType.ALL` ⇒ `"*"`

  ```js
  // from
  permissions: PermissionType.ALL
  // to
  permissions: "*"
  ```

## Function Changelog

#### Constructor
- runtime: type `string | cdk.lambda.Runtime` ⇒ `string`
- timeout: type `number | cdk.Duration` ⇒ `number`
- tracing: type `cdk.lambda.Tracing` ⇒ `"active" | "disabled" | "pass_through"`

  ```js
  // from
  {
    runtime: cdk.lambda.Runtime.lambda.Runtime.NODEJS_14_X,
    timeout: cdk.Duration.seconds(10),
    tracing: cdk.lambda.Tracing.ACTIVE,
  }
  // to
  {
    runtime: "nodejs14.x",
    timeout: 10,
    tracing: "active",
  }
  ```

## Api Changelog

### Constructor
- Moved httpApi ⇒ cdk.httpApi
- Moved stages ⇒ cdk.httpStages

  ```js
  // from
  {
    httpApi,
    stages,
  }
  // to
  {
    cdk: {
      httpApi,
      httpStages,
    },
  }
  ```

- cors.allowMethods: type `CorsHttpMethod[]` ⇒ `string[]`
- cors.maxAge: type `cdk.Duration` ⇒ `string`

  ```js
  // from
  {
    cors: {
      allowMethods: [CorsHttpMethod.GET],
      maxAge: cdk.Duration.days(3),
    },
  }
  // to
  {
    cors: {
      allowMethods: ["GET"],
      maxAge: "3 Days",
    },
  }
  ```

- accessLog.retention: type `cdk.logs.RetentionDays` ⇒ `string`

  ```js
  // from
  {
    accessLog: {
      retention: cdk.logs.RetentionDays.TWO_WEEKS,
    }
  }
  // to
  {
    accessLog: {
      retention: "two weeks",
    }
  }
  ```

- Moved customDomain.domainName (if type is `cdk.apigatewayv2.DomainName`) ⇒ customDomain.cdk.domainName
- Moved customDomain.hostedZone (if type is `cdk.route53.HostedZone`) ⇒ customDomain.cdk.hostedZone
- Moved customDomain.acmCertificate (if type is `cdk.certificatemanager.Certificate`) ⇒ customDomain.cdk.certificate

  ```js
  // from
  {
    customDomain: {
      domainName,     // type is `cdk.apigatewayv2.DomainName`
      hostedZone,     // type is `cdk.route53.HostedZone`
      acmCertificate, // type is `cdk.certificatemanager.DomainName`
    }
  }
  // to
  {
    customDomain: {
      cdk: {
        domainName,
        hostedZone,
        acmCertificate,
      }
    }
  }
  ```

- Moved defaultFunctionProps ⇒ ApiProps.defaults.function
- Moved defaultAuthorizer ⇒ ApiProps.defaults.authorizer (See [Authorizer](#authorizers))
- Moved defaultAuthorizationType ⇒ removed (See [Authorizer](#authorizers))
- Moved defaultAuthorizationScopes ⇒ ApiProps.defaults.authorizationScopes
- Moved defaultPayloadFormatVersion ⇒ ApiProps.defaults.payloadFormatVersion
- Moved defaultThrottlingBurstLimit ⇒ ApiProps.defaults.throtte.burst
- Moved defaultThrottlingRateLimit ⇒ ApiProps.defaults.throttle.rate

  ```js
  // from
  {
    defaultFunctionProps: { timeout: 10 },
    defaultAuthorizer: authorizer,
    defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
    defaultAuthorizationScopes: [...],
    defaultPayloadFormatVersion: cdk.apigatewayv2.PayloadFormatVersion.V2,
    defaultThrottlingBurstLimit: 1000,
    defaultThrottlingRateLimit: 1000,
  }
  // to
  {
    defaults: {
      functionProps: { timeout: 10 },
      authorizer: "lambda",
      authorizationScopes: [...],
      payloadFormatVersion: "2.0",
      throttle: {
        burst: 1000,
        rate: 1000,
      },
    }
  }
  ```

### Authorizers

- NONE authorizer

  ```js
  // from
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.NONE,
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizationType: ApiAuthorizationType.NONE,
      }
    },
  });

  // to
  new Api(stack, "Api", {
    defaults: {
      authorizer: "none",
    },
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "none",
      }
    },
  });
  ```

- IAM authorizer

  ```js
  // from
  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizationType: ApiAuthorizationType.AWS_IAM,
      }
    },
  });

  // to
  new Api(stack, "Api", {
    defaults: {
      authorizer: "iam",
    },
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "iam",
      }
    },
  });
  ```

- JWT authorizer

  ```js
  // from
  import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

  const authorizer = new HttpJwtAuthorizer("Authorizer", "https://myorg.us.auth0.com", {
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
  });

  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: authorizer,
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: authorizer
        authorizationType: ApiAuthorizationType.JWT,
      }
    },
  });

  // to
  new Api(stack, "Api", {
    authorizers: {
      myAuthorizer: {
        type: "jwt",
        jwt: {
          issuer: "https://myorg.us.auth0.com",
          audience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
        }
      },
    },
    defaults: {
      authorizer: "myAuthorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "myAuthorizer",
        authorizationScopes: ["user.id", "user.email"],
      }
    },
  }
  ```

- User Pool authorizer

  ```js
  // from
  import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

  const authorizer = new HttpUserPoolAuthorizer("Authorizer", userPool, {
    userPoolClients: [userPoolClient],
  });

  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.JWT,
    defaultAuthorizer: authorizer,
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: authorizer
        authorizationType: ApiAuthorizationType.JWT,
        authorizationScopes: ["user.id", "user.email"],
      }
    },
  });

  // to
  new Api(stack, "Api", {
    authorizers: {
      myAuthorizer: {
        type: "user_pool",
        userPool: {
          id: userPool.userPoolId,
          clientIds: [userPoolClient.userPoolClientId],
        }
      },
    },
    defaults: {
      authorizer: "myAuthorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "myAuthorizer",
        authorizationScopes: ["user.id", "user.email"],
      }
    },
  }
  ```

- Lambda authorizer

  ```js
  // from
  import { Duration } from "aws-cdk-lib";
  import { HttpLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

  const authHandler = new Function(stack, "AuthHandler", {
    handler: "src/authorizer.main",
  });

  const authorizer = new HttpLambdaAuthorizer("Authorizer", authHandler, {
    authorizerName: "LambdaAuthorizer",
    resultsCacheTtl: Duration.seconds(30),
  });

  new Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
    defaultAuthorizer: authorizer,
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: authorizer
        authorizationType: ApiAuthorizationType.CUSTOM,
      }
    },
  });

  // to
  const authHandler = new Function(stack, "AuthHandler", {
    handler: "src/authorizer.main",
  });

  new Api(stack, "Api", {
    authorizers: {
      myAuthorizer: {
        type: "lambda",
        function: authHandler,
        resultsCacheTtl: "30 seconds",
      },
    },
    defaults: {
      authorizer: "myAuthorizer",
    },
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "myAuthorizer",
      }
    },
  }
  ```

### Routes

- Function routes: Always use full props format

  ```js
  // from
  routes: {
    "GET /notes": {
      handler: "lambda.main",
      timeout: 10,
    }
  }

  // to
  routes: {
    "GET /notes": {
      function: {
        handler: "lambda.main",
        timeout: 10,
      }
    }
  }
  ```

- ALB routes: moved albListener ⇒ cdk.albListener
- ALB routes: moved method ⇒ cdk.integration.method
- ALB routes: moved vpcLink ⇒ cdk.integration.vpcLink

  ```js
  // from
  routes: {
    "GET /notes": {
      albListener,
      method,
      vpcLink,
    }
  }

  // to
  routes: {
    "GET /notes": {
      type: "alb",
      cdk: {
        albListener
        integration: {
          method,
          vpcLink,
        }
      }
    }
  }
  ```

- HTTP Proxy routes: moved method ⇒ cdk.integration.method

  ```js
  // from
  routes: {
    "GET /notes": {
      url: "http://domain.com",
      method,
    }
  }

  // to
  routes: {
    "GET /notes": {
      type: "url",
      url: "http://domain.com",
      cdk: {
        integration: {
          method,
        }
      }
    }
  }
  ```

### Properties

- Moved httpApi ⇒ cdk.httpApi
- Moved accessLogGroup ⇒ cdk.accessLogGroup
- Moved apiGatewayDomain ⇒ cdk.domainName
- Moved acmCertificate ⇒ cdk.certificate

  ```js
  // from
  const api = new Api(stack, "Api", { ... });
  api.httpApi;
  api.accessLogGroup;
  api.apiGatewayDomain;
  api.acmCertificate;

  // to
  const api = new Api(stack, "Api", { ... });
  api.cdk.httpApi;
  api.cdk.accessLogGroup;
  api.cdk.domainName;
  api.cdk.certificate;
  ```

## GraphQLApi Changelog

- Refer to the changes in [Api Changelog](#api-changelog)
- Updated default payloadFormatVersion to "2.0"

  To set payloadFormationVersion to "1.0":

  ```js
  new GraphQLApi(stack, "Api", {
    defaults: {
      payloadFormationVersion: "1.0",
    }
  });
  ```

## WebSocketApi Changelog

### Constructor
- Moved webSocketApi ⇒ cdk.webSocketApi
- Moved webSocketStage ⇒ cdk.webSocketStage

  ```js
  // from
  {
    webSocketApi,
    webSocketStage,
  }
  // to
  {
    cdk: {
      webSocketApi,
      webSocketStage,
    },
  }
  ```
- accessLog.retention: type `cdk.logs.RetentionDays` ⇒ `string`

  ```js
  // from
  {
    accessLog: {
      retention: cdk.logs.RetentionDays.TWO_WEEKS,
    }
  }
  // to
  {
    accessLog: {
      retention: "two weeks",
    }
  }
  ```

- Moved imported customDomain.domainName ⇒ customDomain.cdk.domainName
- Moved imported customDomain.hostedZone ⇒ customDomain.cdk.hostedZone
- Moved imported customDomain.acmCertificate ⇒ customDomain.cdk.certificate

  ```js
  // from
  {
    customDomain: {
      domainName,     // value is type `cdk.apigatewayv2.DomainName`
      hostedZone,     // value is type `cdk.route53.HostedZone`
      acmCertificate, // value is type `cdk.certificatemanager.DomainName`
    }
  }
  // to
  {
    customDomain: {
      cdk: {
        domainName,
        hostedZone,
        acmCertificate,
      }
    }
  }
  ```

### Authorizers

- NONE authorizer

  ```js
  // from
  new WebSocketApi(stack, "Api", {
    authorizationType: WebSocketApiAuthorizationType.NONE,
    routes: {
      $connect: "src/connect.main",
      $default: "src/default.main",
      $disconnect: "src/disconnect.main",
    },
  });

  // to
  new WebSocketApi(stack, "Api", {
    authorizer: "none",
    routes: {
      $connect: "src/connect.main",
      $default: "src/default.main",
      $disconnect: "src/disconnect.main",
    },
  });
  ```

- IAM authorizer

  ```js
  // from
  new WebSocketApi(stack, "Api", {
    authorizationType: WebSocketApiAuthorizationType.IAM,
    routes: {
      $connect: "src/connect.main",
      $default: "src/default.main",
      $disconnect: "src/disconnect.main",
    },
  });

  // to
  new WebSocketApi(stack, "Api", {
    authorizer: "iam",
    routes: {
      $connect: "src/connect.main",
      $default: "src/default.main",
      $disconnect: "src/disconnect.main",
    },
  });
  ```

- Lambda authorizer

  ```js
  // from
  import { WebSocketLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

  const authHandler = new Function(stack, "AuthHandler", {
    handler: "src/authorizer.main",
  });

  const authorizer = new WebSocketLambdaAuthorizer("Authorizer", authorizer, {
    authorizerName: "LambdaAuthorizer",
  });

  new WebSocketApi(stack, "Api", {
    authorizationType: WebSocketApiAuthorizationType.CUSTOM,
    defaultAuthorizer: authorizer,
    routes: {
      $connect: "src/connect.main",
      $default: "src/default.main",
      $disconnect: "src/disconnect.main",
    },
  });

  // to
  const authHandler = new Function(stack, "AuthHandler", {
    handler: "src/authorizer.main",
  });

  new WebSocketApi(stack, "Api", {
    authorizer: {
      type: "lambda",
      function: authHandler,
    },
    routes: {
      $connect: "src/connect.main",
      $default: "src/default.main",
      $disconnect: "src/disconnect.main",
    },
  });
  ```

### Properties

- Moved webSocketApi ⇒ cdk.webSocketApi
- Moved webSocketStage ⇒ cdk.webSocketStage
- Moved accessLogGroup ⇒ cdk.accessLogGroup
- Moved apiGatewayDomain ⇒ cdk.domainName
- Moved acmCertificate ⇒ cdk.certificate

  ```js
  // from
  const api = new WebSocketApi(stack, "Api", { ... });
  api.webSocketApi;
  api.webSocketStage;
  api.accessLogGroup;
  api.apiGatewayDomain;
  api.acmCertificate;

  // to
  const api = new WebSocketApi(stack, "Api", { ... });
  api.cdk.webSocketApi;
  api.cdk.webSocketStage;
  api.cdk.accessLogGroup;
  api.cdk.domainName;
  api.cdk.certificate;
  ```

## AppSyncApi Changelog

### Constructor
- Moved graphqlApi.schema ⇒ schema
- Moved graphqlApi (other props) ⇒ cdk.graphqlApi

  ```js
  // from
  {
    graphqlApi: {
      schema: "path/to/schema.graphql";
      name: "My GraphQL API",
      xrayEnabled: false,
    },
  }
  // to
  {
    schema: "path/to/schema.graphql";
    cdk: {
      graphqlApi: {
        name: "My GraphQL API",
        xrayEnabled: false,
      }
    },
  }
  ```

### Data sources

- Function routes: moved options.name ⇒ name
- Function routes: moved options.description ⇒ description

  ```js
  // from
  dataSources: {
    notesDS: {
      function: "src/notes.main",
      options: {
        name: "My Data Source",
        description: "This is my Data Source",
      },
    },
  },

  // to
  dataSources: {
    notesDS: {
      function: "src/notes.main",
      name: "My Data Source",
      description: "This is my Data Source",
    },
  },
  ```

- DynamoDB routes: moved options.name ⇒ name
- DynamoDB routes: moved options.description ⇒ description
- DynamoDB routes: moved table (if type is `cdk.dynamodb.Table`) ⇒ cdk.dataSource.table

  ```js
  // from
  dataSources: {
    notesDS: {
      table: dynamodb.Table.fromTableArn(stack, "ImportedTable", ...),
      options: {
        name: "My Data Source",
        description: "This is my Data Source",
      },
    },
  },

  // to
  dataSources: {
    notesDS: {
      type: "dynamodb",
      name: "My Data Source",
      description: "This is my Data Source",
      cdk: {
        dataSource: {
          table: dynamodb.Table.fromTableArn(stack, "ImportedTable", ...),
        },
      },
    },
  },
  ```

- RDS routes: moved options.name ⇒ name
- RDS routes: moved options.description ⇒ description
- RDS routes: moved serverlessCluster (if type is `sst.RDS`) ⇒ rds
- RDS routes: moved serverlessCluster (if type is `cdk.rds.ServerlessCluster`) ⇒ cdk.dataSource.serverlessCluster
- RDS routes: moved secretStore ⇒ cdk.dataSource.secretStore
- RDS routes: moved databaseName ⇒ cdk.dataSource.databaseName

  ```js
  // from
  dataSources: {
    notesDS: {
      serverlessCluster,
      secretStore,
      databaseName,
      options: {
        name: "My Data Source",
        description: "This is my Data Source",
      },
    },
  },

  // to
  dataSources: {
    notesDS: {
      type: "rds",
      name: "My Data Source",
      description: "This is my Data Source",
      cdk: {
        dataSource: {
          serverlessCluster,
          secretStore,
          databaseName,
        },
      },
    },
  },
  ```

- HTTP routes: moved options.name ⇒ name
- HTTP routes: moved options.description ⇒ description
- HTTP routes: moved options.authorizationConfig ⇒ cdk.dataSource.authorizationConfig

  ```js
  // from
  dataSources: {
    notesDS: {
      endpoint: "https://states.amazonaws.com",
      options: {
        name: "My Data Source",
        description: "This is my Data Source",
        authorizationConfig: {
          signingRegion: "us-east-1",
          signingServiceName: "states",
        },
      },
    },
  },

  // to
  dataSources: {
    notesDS: {
      type: "http",
      endpoint: "https://states.amazonaws.com",
      name: "My Data Source",
      description: "This is my Data Source",
      cdk: {
        dataSource: {
          authorizationConfig: {
            signingRegion: "us-east-1",
            signingServiceName: "states",
          },
        },
      },
    },
  },

### Resolvers

- Moved resolverProps ⇒ cdk.resolver

  ```js
  // from
  resolvers: {
    "Query listNotes": {
      table: notesTable,
      resolverProps: {
        requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
        responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
      },
    },
  },

  // to
  resolvers: {
    "Query listNotes": {
      type: "dynamodb",
      table: notesTable,
      cdk: {
        resolver: {
          requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
          responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
        },
      },
    },
  },
  ```

#### Properties

- Moved graphqlApi ⇒ cdk.graphqlApi

  ```js
  // from
  const api = new AppSyncApi(stack, "Api", { ... });
  api.graphqlApi;

  // to
  const api = new AppSyncApi(stack, "Api", { ... });
  api.cdk.graphqlApi;
  ```

## ApiGatewayV1 Changelog

### Constructor
- Moved restApi ⇒ cdk.restApi
- Moved importedPaths ⇒ cdk.importedPaths

  ```js
  // from
  {
    restApi,
    importedPaths,
  }
  // to
  {
    cdk: {
      restApi,
      importedPaths,
    },
  }
  ```

- accessLog.retention: type `cdk.logs.RetentionDays` ⇒ `string`

  ```js
  // from
  {
    accessLog: {
      retention: cdk.logs.RetentionDays.TWO_WEEKS,
    }
  }
  // to
  {
    accessLog: {
      retention: "two weeks",
    }
  }
  ```

- Moved customDomain.domainName (if type is `cdk.apigateway.DomainName`) ⇒ customDomain.cdk.domainName
- Moved customDomain.hostedZone (if type is `cdk.route53.HostedZone`) ⇒ customDomain.cdk.hostedZone
- Moved customDomain.acmCertificate (if type is `cdk.certificatemanager.Certificate`) ⇒ customDomain.cdk.certificate
- customDomain.endpointType: type `cdk.apigateway.EndpointType` ⇒ `"edge | regional | private"`
- customDomain.securityPolicy: type `cdk.apigateway.SecurityPolicy` ⇒ `"TLS 1.0 | TLS 1.2"`
- customDomain.mtls.bucket: type `cdk.s3.Bucket` ⇒ `sst.Bucket`

  ```js
  // from
  {
    customDomain: {
      domainName,     // type is `cdk.apigateway.DomainName`
      hostedZone,     // type is `cdk.route53.HostedZone`
      acmCertificate, // type is `cdk.certificatemanager.DomainName`
      endpointType: cdk.apigatway.EndpointType.REGIONAL,
      securityPolicy: cdk.apigatway.SecurityPolicy.TLS_1_0,
      mtls: {
        bucket,
      },
    }
  }
  // to
  {
    customDomain: {
      endpointType: "regional",
      securityPolicy: "TLS 1.0",
      mtls: {
        bucket: new Bucket(stack, "mtlsBucket", {
          cdk: { bucket },
        }),
      },
      cdk: {
        domainName,
        hostedZone,
        acmCertificate,
      }
    }
  }
  ```

- Constructor: defaults

    ApiProps.defaultFunctionProps ⇒ ApiProps.defaults.function

    ApiProps.defaultAuthorizer ⇒ ApiProps.defaults.authorizer (takes string now)

    ApiProps.defaultAuthorizationType ⇒ removed

    ApiProps.defaultAuthorizationScopes ⇒ ApiProps.defaults.authorizationScopes

- Moved defaultFunctionProps ⇒ ApiProps.defaults.function
- Moved defaultAuthorizer ⇒ ApiProps.defaults.authorizer (See [Authorizer](#authorizers))
- Moved defaultAuthorizationType ⇒ removed (See [Authorizer](#authorizers))
- Moved defaultAuthorizationScopes ⇒ ApiProps.defaults.authorizationScopes

  ```js
  // from
  {
    defaultFunctionProps: { timeout: 10 },
    defaultAuthorizer: authorizer,
    defaultAuthorizationType: cdk.apig.AuthorizationType.COGNITO,
    defaultAuthorizationScopes: [...],
  }
  // to
  {
    defaults: {
      functionProps: { timeout: 10 },
      authorizer: "user_pools",
      authorizationScopes: [...],
    }
  }
  ```

### Authorizers
- resultsCacheTtl: default `5 minutes` ⇒ `0 seconds` (not caching by default)

- NONE authorizer

  ```js
  // from
  new ApiGatewayV1(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.NONE,
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizationType: ApiAuthorizationType.NONE,
      }
    },
  });

  // to
  new ApiGatewayV1(stack, "Api", {
    defaults: {
      authorizer: "none",
    },
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "none",
      }
    },
  });
  ```

- IAM authorizer

  ```js
  // from
  new ApiGatewayV1(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.IAM,
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizationType: ApiAuthorizationType.IAM,
      }
    },
  });

  // to
  new ApiGatewayV1(stack, "Api", {
    defaults: {
      authorizer: "iam",
    },
    routes: {
      "GET  /notes": "list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "iam",
      }
    },
  });
  ```

- User Pools authorizer

  ```js
  // from
  import { CognitoUserPoolsAuthorizer } from "@aws-cdk/aws-apigatewayv";

  const authorizer = new CognitoUserPoolsAuthorizer(stack, "Authorizer", {
    cognitoUserPools: [userPool],
  });

  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: apigateway.AuthorizationType.COGNITO,
    defaultAuthorizer: authorizer,
    defaultAuthorizationScopes: ["user.id", "user.email"],
    routes: {
      "GET /notes": "src/list.main",
    },
  });

  // to
  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      myAuthorizer: {
        type: "user_pools",
        userPoolIds: [userPool.userPoolId],
      }
    },
    defaults: {
      authorizer: "myAuthorizer",
      authorizationScopes: ["user.id", "user.email"],
    },
    routes: {
      "GET /notes": "src/list.main",
    },
  });
  ```

- Lambda TOKEN authorizer

  ```js
  // from
  import { Duration } from "aws-cdk-lib";
  import { IdentitySource, TokenAuthorizer } from "@aws-cdk/aws-apigateway";

  const authHandler = new Function(stack, "Authhandler", {
    handler: "src/authorizer.main",
  }),
  
  const authorizer = new TokenAuthorizer(stack, "Authorizer", {
    handler: authHandler,
    resultsCacheTtl: Duration.seconds(30),
    identitySource: IdentitySource.heade"Authorization"),
  });

  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
    defaultAuthorizer: authorizer,
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: authorizer
        authorizationType: ApiAuthorizationType.CUSTOM,
      }
    },
  });

  // to
  import { RequestAuthorizer } from "@aws-cdk/aws-apigateway";

  const authHandler = new Function(stack, "AuthHandler", {
    handler: "src/authorizer.main",
  });

  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      myAuthorizer: {
        type: "lambda_token",
        function: authHandler,
        resultsCacheTtl: "30 seconds",
        identitySource: IdentitySource.header("Authorization"),
      },
    },
    defaults: {
      authorizer: "myAuthorizer",
    },
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "myAuthorizer",
      }
    },
  }
  ```

- Lambda REQUEST authorizer

  ```js
  // from
  import { Duration } from "aws-cdk-lib";
  import { IdentitySource, RequestAuthorizer } from "@aws-cdk/aws-apigateway";

  const authHandler = new Function(stack, "Authhandler", {
    handler: "src/authorizer.main",
  }),
  
  const authorizer = new RequestAuthorizer(stack, "Authorizer", {
    handler: authHandler,
    resultsCacheTtl: Duration.seconds(30),
    identitySources: [IdentitySource.heade"Authorization")],
  });

  new ApiGatewayV1Api(stack, "Api", {
    defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
    defaultAuthorizer: authorizer,
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: authorizer
        authorizationType: ApiAuthorizationType.CUSTOM,
      }
    },
  });

  // to
  import { RequestAuthorizer } from "@aws-cdk/aws-apigateway";

  const authHandler = new Function(stack, "AuthHandler", {
    handler: "src/authorizer.main",
  });

  new ApiGatewayV1Api(stack, "Api", {
    authorizers: {
      myAuthorizer: {
        type: "lambda_request",
        function: authHandler,
        resultsCacheTtl: "30 seconds",
        identitySources: [IdentitySource.header("Authorization")],
      },
    },
    defaults: {
      authorizer: "myAuthorizer",
    },
    routes: {
      "GET /notes": "src/list.main",
      "POST /notes": {
        function: "create.main",
        authorizer: "myAuthorizer",
      }
    },
  }
  ```

### Routes

- Always use full props format

  ```js
  // from
  routes: {
    "GET /notes": {
      handler: "lambda.main",
      timeout: 10,
    }
  }

  // to
  routes: {
    "GET /notes": {
      function: {
        handler: "lambda.main",
        timeout: 10,
      }
    }
  }
  ```

- Moved methodOptions ⇒ cdk.method
- Moved integrationOptions ⇒ cdk.integration

  ```js
  // from
  routes: {
    "GET /notes": {
      function: "lambda.main",
      methodOptions,
      integrationOptions,
    }
  }

  // to
  routes: {
    "GET /notes": {
      function: "lambda.main",
      cdk: {
        method,
        integration,
      }
    }
  }
  ```

#### Properties

- Moved restApi ⇒ cdk.restApi
- Moved accessLogGroup ⇒ cdk.accessLogGroup
- Moved apiGatewayDomain ⇒ cdk.domainName
- Moved acmCertificate ⇒ cdk.certificate

  ```js
  // from
  const api = new ApiGatewayV1Api(stack, "Api", { ... });
  api.restApi;
  api.accessLogGroup;
  api.apiGatewayDomain;
  api.acmCertificate;

  // to
  const api = new ApiGatewayV1Api(stack, "Api", { ... });
  api.cdk.restApi;
  api.cdk.accessLogGroup;
  api.cdk.domainName;
  api.cdk.certificate;
  ```

## Auth Changelog

#### Constructor
- Moved cognito.userPool ⇒ cdk.userPool
- Moved cognito.userPoolClient ⇒ cdk.userPoolClient
- Moved cognito.triggers ⇒ triggers
- Moved cognito.defaultFunctionProps ⇒ defaults.function

  ```js
  // from
  {
    cognito: {
      userPool,
      userPoolClient,
      triggers: {
        preAuthentication: "src/preAuthentication.main",
      },
      defaultFunctionProps: {
        timeout: 10,
      },
    },
  }

  // to
  {
    triggers: {
      preAuthentication: "src/preAuthentication.main",
    },
    defaults: {
      function: {
        timeout: 10,
      },
    },
    cdk: {
      userPool,
      userPoolClient,
    },
  }
  ```

- Moved identityPool ⇒ identityPoolFederation.cdk.cfnIdentityPool
- Moved apple ⇒ identityPoolFederation.apple
- Moved auth0 ⇒ identityPoolFederation.auth0
- Moved google ⇒ identityPoolFederation.google
- Moved facebook ⇒ identityPoolFederation.facebook
- Moved twitter ⇒ identityPoolFederation.twitter
- Moved amazon ⇒ identityPoolFederation.amazon

  ```js
  // from
  {
    auth0: { domain, clientId },
    apple: { servicesId },
    google: { clientId },
    facebook: { appId },
    twitter: { consumerKey, consumerSecret },
    amazon: { appId },
    identityPool,
  }

  // to
  {
    identityPoolFederation: {
      auth0: { domain, clientId },
      apple: { servicesId },
      google: { clientId },
      facebook: { appId },
      twitter: { consumerKey, consumerSecret },
      amazon: { appId },
    },
    cdk: {
      identityPool,
    },
  }
  ```

#### Properties

- Moved cognitoUserPool ⇒ cdk.userPool
- Moved cognitoUserPoolClient ⇒ cdk.userPoolClient
- Moved cognitoCfnIdentityPool ⇒ cdk.cfnIdentityPool
- Moved iamAuthRole ⇒ cdk.authRole
- Moved iamUnauthRole ⇒ cdk.unauthRole

  ```js
  // from
  const auth = new Auth(stack, "Auth", { ... });
  auth.cognitoUserPool;
  auth.cognitoUserPoolClient;
  auth.cognitoCfnIdentityPool;
  auth.iamAuthRole;
  auth.iamUnauthRole;

  // to
  const auth = new Auth(stack, "Auth", { ... });
  auth.cdk.userPool;
  auth.cdk.userPoolClient;
  auth.cdk.cfnIdentityPool;
  auth.cdk.authRole;
  auth.cdk.unauthRole;
  ```

## Bucket Changelog

#### Constructor
- Moved s3Bucket ⇒ cdk.bucket

  ```js
  // from
  {
    s3Bucket,
  }
  // to
  {
    cdk: {
      bucket,
    },
  }
  ```

#### Notifications
- Structure change from `Array[]` ⇒ `Object{}`

  ```js
  // from
  notifications: [
    "src/notification1.main"
    "src/notification2.main"
  ]

  // to
  notifications: {
    "0": "src/notification1.main",
    "1": "src/notification2.main",
  }
  ```

- Function notifications: Always use full props format

  ```js
  // from
  notifications: {
    myNotification: {
      handler: "lambda.main",
      timeout: 10,
    }
  }

  // to
  notifications: {
    myNotification: {
      function: {
        handler: "lambda.main",
        timeout: 10,
      }
    }
  }
  ```

- Moved notificationProps.filters ⇒ filters
- Moved notificationProps.events ⇒ events
- events: type `s3.EventType[]` ⇒ `string`

  ```js
  // from
  new Bucket(stack, "Bucket", {
    notifications: [{
      function: "lambda.main",
      notificationProps: {
        events: [EventType.OBJECT_CREATED],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      },
    }],
  });

  // to
  new Bucket(stack, "Bucket", {
    notifications: {
      myNotification: {
        function: "lambda.main",
        events: ["object_created"],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      }
    },
  });
  ```

#### Properties

- Moved s3Bucket ⇒ cdk.bucket

  ```js
  // from
  const bucket = new Bucket(stack, "Bucket", { ... });
  bucket.s3Bucket;

  // to
  const bucket = new Bucket(stack, "Bucket", { ... });
  bucket.cdk.bucket;
  ```

- addNotifications(): structure change from `Array[]` ⇒ `Object{}`

  ```js
  bucket.addNotifications(stack, [
    "src/function1.main",
    "src/function2.main",
  ]);

  //to
  bucket.addNotifications(stack, {
    "0": "src/function1.main",
    "1": "src/function2.main",
  });
  ```

- attachPermissionsToNotification(): argument `integer` ⇒ `string`

  ```js
  bucket.attachPermissionsToNotification(0, [...]);
  //to
  bucket.attachPermissionsToNotification("myNotification", [...]);
  ```

## Cron Changelog

#### Constructor

- Moved eventsRule ⇒ cdk.rule

  ```js
  // from
  {
    eventsRule,
  }
  // to
  {
    cdk: {
      rule,
    },
  }
  ```

- Moved schedule (if type is `cdk.events.CronOptions`) ⇒ cdk.rule.schedule

  ```js
  // from
  new Cron(this, "Cron", {
    schedule: { minute: "0", hour: "4" },
    job: "src/lambda.main",
  });

  // to
  new Cron(this, "Cron", {
    job: "src/lambda.main",
    cdk: {
      rule: {
        schedule: { minute: "0", hour: "4" },
      },
    },
  });
  ```

- Job: moved jobProps ⇒ cdk.target

  ```js
  // from
  new Cron(this, "Cron", {
    schedule: "rate(1 minute)",
    job: {
      function: "src/lambda.main",
      jobProps: {
        event: RuleTargetInput.fromObject({
          key: "value"
        }),
      },
    },
  });

  // to
  new Cron(this, "Cron", {
    schedule: "rate(1 minute)",
    job: "src/lambda.main",
    cdk: {
      target: {
        event: RuleTargetInput.fromObject({
          key: "value"
        }),
      },
    },
  });
  ```

#### Properties

- Moved eventsRule ⇒ cdk.rule

  ```js
  // from
  const cron = new Cron(stack, "Cron", { ... });
  cron.eventsRule;

  // to
  const cron = new Cron(stack, "Cron", { ... });
  cron.cdk.rule;
  ```

## EventBus Changelog

#### Constructor
- Moved eventBridgeEventBus ⇒ cdk.eventBus

  ```js
  // from
  {
    eventBridgeEventBus,
  }
  // to
  {
    cdk: {
      eventBus,
    },
  }
  ```

- Constructor

    EventBusProps.rules[ANY].description ⇒ EventBusProps.rules[ANY].cdk.rule.description

    EventBusProps.rules[ANY].enabled ⇒ EventBusProps.rules[ANY].cdk.rule.enabled

    EventBusProps.rules[ANY].eventPattern ⇒ EventBusProps.rules[ANY].cdk.rule.eventPattern

    EventBusProps.rules[ANY].ruleName ⇒ EventBusProps.rules[ANY].cdk.rule.ruleName

    EventBusProps.rules[ANY].schedule ⇒ EventBusProps.rules[ANY].cdk.rule.schedule

    EventBusProps.rules[ANY].targets[] ⇒ EventBusProps.rules[ANY].targets{}

    ```jsx
    new EventBus(stack, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["myevent"] },
    		  targets: [
    		    "src/function1.main",
    		    "src/function2.main",
    		  ],
    		},
    	},
    });

    // to
    new EventBus(stack, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["myevent"] },
    		  targets: {
    		    "0": "src/function1.main",
    		    "1": "src/function2.main",
    		  },
    		},
    	},
    });
    ```

    EventBusProps.rules[ANY].targets[ANY].targetProps ⇒ EventBusProps.rules[ANY].targets[ANY].cdk.target

- Methods

    EventBus.addNotifications[] ⇒EventBus.addNotifications{}

    ```jsx
    bus.addRules(stack, {
      rule2: {
        eventPattern: { source: ["myevent"] },
    	  targets: [
    	    "src/function3.main",
    	    "src/function4.main",
    	  ],
    	}
    });

    //to
    bus.addRules(stack, {
      rule2: {
        eventPattern: { source: ["myevent"] },
    	  targets: {
    	    "2": "src/function3.main",
    	    "3": "src/function4.main",
    	  },
    	}
    });
    ```

    EventBus.attachPermissionsToTarget(ruleKey, targetIndex, permission) ⇒ EventBus.attachPermissionsToTarget(ruleKey, targetName, permission)

#### Properties

- Moved eventsRule ⇒ cdk.rule

  ```js
  // from
  const bus = new EventBus(stack, "Bus", { ... });
  bus.eventBus;

  // to
  const bus = new EventBus(stack, "Bus", { ... });
  bus.cdk.eventBus;
  ```

## KinesisStream Changelog

#### Constructor
- Moved kinesisStream ⇒ cdk.stream

  ```js
  // from
  {
    kinesisStream,
  }
  // to
  {
    cdk: {
      stream,
    },
  }
  ```

- Constructor

    KinesisStreamProps.consumers[ANY].consumerProps ⇒ KinesisStreamProps.consumers[ANY].cdk.eventSource

#### Properties

- Moved kinesisStream ⇒ cdk.stream

  ```js
  // from
  const stream = new KinesisStream(stack, "Stream", { ... });
  stream.kinesisStream;

  // to
  const stream = new KinesisStream(stack, "Stream", { ... });
  stream.cdk.stream;
  ```

## Queue Changelog

#### Constructor
- Moved kinesisStream ⇒ cdk.stream

  ```js
  // from
  {
    sqsQueue,
  }
  // to
  {
    cdk: {
      queue,
    },
  }
  ```


- Constructor

    QueueProps.consumer.consumerProps ⇒ QueueProps.consumer.cdk.eventSource

#### Properties

- Moved eventsRule ⇒ cdk.rule

  ```js
  // from
  const queue = new Queue(stack, "Queue", { ... });
  queue.sqsQueue;

  // to
  const queue = new Queue(stack, "Queue", { ... });
  queue.cdk.queue;
  ```

## RDS Changelog

#### Constructor
- Moved rdsServerlessCluster ⇒ cdk.cluster

  ```js
  // from
  {
    rdsServerlessCluster,
  }
  // to
  {
    cdk: {
      cluster,
    },
  }
  ```

#### Properties

- Moved rdsServerlessCluster ⇒ cdk.cluster

  ```js
  // from
  const rds = new RDS(stack, "Database", { ... });
  rds.rdsServerlessCluster;

  // to
  const rds = new RDS(stack, "Database", { ... });
  rds.cdk.cluster;
  ```

## Table Changelog

#### Constructor
- Moved dynamodbTable ⇒ cdk.table

  ```js
  // from
  {
    dynamodbTable,
  }
  // to
  {
    cdk: {
      table,
    },
  }
  ```


- Constructor

    TableProps.fields[ANY] dynamodb.AttributeType TableFieldType ⇒ "binary | number | string"

    TableProps.stream dynamodb.StreamViewType ⇒ "new_image | old_image | new_and_old_images | keys_only"

    TableProps.primaryIndex.indexProps ⇒ TableProps.primaryIndex.cdk.index

    TableProps.globalIndexes[ANY].indexProps ⇒ TableProps.globalIndexes[ANY].cdk.index

    TableProps.localIndexes[ANY].indexProps ⇒ TableProps.localIndexes[ANY].cdk.index

    QueueProps.consumers[ANY].consumerProps ⇒ QueueProps.consumers[ANY].cdk.eventSource

#### Properties

- Moved dynamodbTable ⇒ cdk.table

  ```js
  // from
  const table = new Table(stack, "Table", { ... });
  table.dynamodbTable;

  // to
  const table = new Table(stack, "Table", { ... });
  table.cdk.table;
  ```

## Topic Changelog

#### Constructor
- Moved snsTopic ⇒ cdk.topic

  ```js
  // from
  {
    snsTopic,
  }
  // to
  {
    cdk: {
      topic,
    },
  }
  ```


- Constructor

    TopicProps.subscribers[] ⇒ TopicProps.subscribers{}

    ```jsx
    new Topic(stack, "Topic", {
      subscribers: [
        "src/function1.main",
        "src/function2.main",
      ],
    });

    // to
    new Topic(stack, "Topic", {
      subscribers: {
        "0": "src/function1.main",
        "1": "src/function2.main",
      },
    });
    ```

    TopicProps.subscribers[ANY].subscriberProps ⇒ TopicProps.subscribers[ANY].cdk.subscription

- Methods

    Topic.addSubscribers[] ⇒Topic.addSubscribers{}

    ```jsx
    topic.addSubscribers(stack, [
      "src/function1.main",
      "src/function2.main",
    ]);

    //to
    topic.addSubscribers(stack, {
      "0": "src/function1.main",
      "1": "src/function2.main",
    });
    ```

    Topic.attachPermissionsToSubscriber(index, permission) ⇒Topic.attachPermissionsToSubscriber(subscriberName, permission)

#### Properties

- Moved snsTopic ⇒ cdk.topic
- Moved snsSubscriptions ⇒ subscriptions

  ```js
  // from
  const topic = new Topic(stack, "Topic", { ... });
  topic.snsTopic;
  topic.snsSubscriptions;

  // to
  const topic = new Topic(stack, "Topic", { ... });
  topic.cdk.topic;
  topic.subscriptions;
  ```

## StaticSite/ReactStaticSite/ViteStaticSite Changelog

#### Constructor
- Moved s3Bucket ⇒ cdk.bucket
- Moved cfDistribution ⇒ cdk.distribution

  ```js
  // from
  {
    s3Bucket,
    cfDistribution,
  }
  // to
  {
    cdk: {
      bucket,
      distribution,
    },
  }
  ```


- Constructor

    StaticSiteProps.customDomain.hostedZone (is construct) ⇒ StaticSiteProps.customDomain.cdk.hostedZone

    StaticSiteProps.customDomain.certificate ⇒ StaticSiteProps.customDomain.cdk.certificate

    StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE ⇒ "redirect_to_index_page"

#### Properties

- Moved s3Bucket ⇒ cdk.bucket
- Moved cfDistribution ⇒ cdk.distribution
- Moved hostedZone ⇒ cdk.hostedZone
- Moved acmCertificate ⇒ cdk.certificate

  ```js
  // from
  const site = new StaticSite(stack, "Site", { ... });
  site.s3Bucket;
  site.cfDistribution;
  site.hostedZone;
  site.acmCertificate;

  // to
  const site = new StaticSite(stack, "Site", { ... });
  site.cdk.bucket
  site.cdk.distribution
  site.cdk.hostedZone
  site.cdk.certificate
  ```

## NextjsSite Changelog

#### Constructor
- Moved s3Bucket ⇒ cdk.bucket
- Moved cfDistribution ⇒ cdk.distribution
- Moved cfCachePolicies ⇒ cdk.cachePolicies
- Moved sqsRegenerationQueue ⇒ cdk.regenerationQueue

  ```js
  // from
  {
    s3Bucket,
    cfDistribution,
    cfCachePolicies,
    sqsRegenerationQueue,
  }
  // to
  {
    cdk: {
      bucket,
      distribution,
      cachePolicies,
      regenerationQueue,
    },
  }
  ```

- Constructor


    NextjsSiteProps.customDomain.hostedZone (is construct) ⇒ NextjsSiteProps.customDomain.cdk.hostedZone

    NextjsSiteProps.customDomain.certificate ⇒ NextjsSiteProps.customDomain.cdk.certificate

#### Properties

- Moved s3Bucket ⇒ cdk.bucket
- Moved sqsRegenerationQueue ⇒ cdk.regenerationQueue
- Moved cfDistribution ⇒ cdk.distribution
- Moved hostedZone ⇒ cdk.hostedZone
- Moved acmCertificate ⇒ cdk.certificate

  ```js
  // from
  const site = new NextjsSite(stack, "Site", { ... });
  site.s3Bucket;
  site.sqsRegenerationQueue;
  site.cfDistribution;
  site.hostedZone;
  site.acmCertificate;

  // to
  const site = new NextjsSite(stack, "Site", { ... });
  site.cdk.bucket
  site.cdk.regenerationQueue
  site.cdk.distribution
  site.cdk.hostedZone
  site.cdk.certificate
  ```

