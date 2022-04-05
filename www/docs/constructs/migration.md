---
title: Migrate to v1.0
description: "Docs for the constructs in the @serverless-stack/resources package"
---

## Goals

The v1 SST constructs were restrucrtured with the following goals in mind:

1. Consistent interfaces for:

    - Customizing underlying AWS resources

      SST provides a convenient way for you to configure commonly used properties. Like the custom domain and access log for the `Api`. But it also allows you to configure other CDK properties in a more consistent way by using the new `cdk` prop. For example:
      ```js
      const api = new sst.Api(stack, "Api", {
        cdk: {
          httpApi: {
            disableExecuteApiEndpoint: true,
          },
        }
      });
      ```

    - Accessing underlying AWS resource names and ARNs

      Similarly, you can access the internally created CDK constructs in a consistent way using the `cdk` attribute. For example:
      ```js
      api.cdk.httpApi;        // cdk.apigatewayv2.HttpApi construct
      api.cdk.accessLogGroup; // cdk.logs.LogGroup construct
      ```

2. Reduce the need for CDK imports
   
   Unless you are customizing the underlying CDK constructs, you no longer need to have CDK packages as a dependency. For example, configuring CORS required you to depend on the `aws-cdk-lib` and the `@aws-cdk/aws-apigatewayv2-alpha`:
    ```js
    import { Duration } from "aws-cdk-lib";
    import { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";

    new sst.Api(stack, "Api", {
      cors: {
        allowMethods: [CorsHttpMethod.GET],
        maxAge: Duration.days(5),
      },
    });
    ```
    Now you can just do.
    ```js
    new sst.Api(stack, "Api", {
      cors: {
        allowMethods: ["GET"],
        maxAge: "3 Days",
      },
    });
    ```
    And the string values are auto-completed in your IDE.
3. Complete support for inline TS Docs
   
   v1 SST constructs also come with TS Docs. So you can see helpful docs in your IDE and the new construct docs are also auto-generated from them.
   
4. Laying the foundation for full typesafey

## Upgrade Steps
Estimated time: 15 minutes

Prerequisite: Update SST to v0.59.0 or later

1. Run `npx sst update 1.0.0-beta.5`
2. For each SST construct used in your app, find its corresponding section in the [Changelog](#changelog) below, and follow the steps to update.
3. Ensure that all the constructs have been updated:
    - For TS projects (ie. using `index.ts`), run `npx run tsc --noEmit` or `yarn run tsc --noEmit` to ensure there are no type errors.
    - For JS projects (ie. using `index.js`), run `npx sst build` or `yarn sst build` to ensure there are no build warnings.
4. As a final check, run `npx sst diff` prior to deploying and review the proposed changes.

## Changelog
### App Changelog
- app.setDefaultRemovalPolicy(): argument type `cdk.RemovalPolicy` ⇒ `"destroy" | "retain" | "snapshot"`

```js
// from
app.setDefaultRemovalPolicy(cdk.RemovalPolicy.DESTROY);
// to
app.setDefaultRemovalPolicy("destroy");
```

### Permissions Changelog
- Type `PermissionType.ALL` ⇒ `"*"`

```js
// from
permissions: PermissionType.ALL
// to
permissions: "*"
```

### Function Changelog

#### Constructor
- runtime: default updated to "nodejs14.x"
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

### Api Changelog

#### Constructor
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

#### CORS
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

#### Access log
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

#### Custom domain
- Moved customDomain.domainName (if type is `cdk.apigatewayv2.DomainName`) ⇒ customDomain.cdk.domainName
- Moved customDomain.hostedZone (if type is `cdk.route53.HostedZone`) ⇒ customDomain.cdk.hostedZone
- Moved customDomain.acmCertificate (if type is `cdk.certificatemanager.Certificate`) ⇒ customDomain.cdk.certificate

```js
// from
{
  customDomain: {
    domainName,     // type is `cdk.apigatewayv2.DomainName`
    hostedZone,     // type is `cdk.route53.HostedZone`
    acmCertificate, // type is `cdk.certificatemanager.Certificate`
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

#### Default settings
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

#### Authorizers
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

#### Routes
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

#### Properties

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

### GraphQLApi Changelog

- Refer to the changes in [Api Changelog](#api-changelog)
- defaults.payloadFormatVersion: default updated to "2.0"

To set payloadFormationVersion to "1.0":

```js
new GraphQLApi(stack, "Api", {
  defaults: {
    payloadFormationVersion: "1.0",
  }
});
```

### WebSocketApi Changelog

#### Constructor
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

#### Access log
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

#### Custom domain
- Moved customDomain.domainName (if type is `cdk.apigatewayv2.DomainName`) ⇒ customDomain.cdk.domainName
- Moved customDomain.hostedZone (if type is `cdk.route53.HostedZone`) ⇒ customDomain.cdk.hostedZone
- Moved customDomain.acmCertificate (if type is `cdk.certificatemanager.Certificate`) ⇒ customDomain.cdk.certificate

```js
// from
{
  customDomain: {
    domainName,     // value is type `cdk.apigatewayv2.DomainName`
    hostedZone,     // value is type `cdk.route53.HostedZone`
    acmCertificate, // value is type `cdk.certificatemanager.Certificate`
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

#### Authorizers
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

#### Routes
- Function routes: Always use full props format

```js
// from
routes: {
  sendMessage: {
    handler: "lambda.main",
    timeout: 10,
  }
}

// to
routes: {
  sendMessage: {
    function: {
      handler: "lambda.main",
      timeout: 10,
    }
  }
}
```

#### Properties
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

### AppSyncApi Changelog

#### Constructor
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

#### Data sources
- Function data sources: Always use full props format

```js
// from
dataSources: {
  notesDs: {
    handler: "lambda.main",
    timeout: 10,
  }
}

// to
dataSources: {
  notesDs: {
    function: {
      handler: "lambda.main",
      timeout: 10,
    }
  }
}
```

- Function data sources: moved options.name ⇒ name
- Function data sources: moved options.description ⇒ description

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

- DynamoDB data sources: moved options.name ⇒ name
- DynamoDB data sources: moved options.description ⇒ description
- DynamoDB data sources: moved table (if type is `cdk.dynamodb.Table`) ⇒ cdk.dataSource.table

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

- RDS data sources: moved options.name ⇒ name
- RDS data sources: moved options.description ⇒ description
- RDS data sources: moved serverlessCluster (if type is `sst.RDS`) ⇒ rds
- RDS data sources: moved serverlessCluster (if type is `cdk.rds.ServerlessCluster`) ⇒ cdk.dataSource.serverlessCluster
- RDS data sources: moved secretStore ⇒ cdk.dataSource.secretStore
- RDS data sources: moved databaseName ⇒ cdk.dataSource.databaseName

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

- HTTP data sources: moved options.name ⇒ name
- HTTP data sources: moved options.description ⇒ description
- HTTP data sources: moved options.authorizationConfig ⇒ cdk.dataSource.authorizationConfig

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

#### Resolvers
- Always use full props format

```js
// from
resolvers: {
  "Query listNotes": {
    handler: "lambda.main",
    timeout: 10,
  }
}

// to
resolvers: {
  "Query listNotes": {
    function: {
      handler: "lambda.main",
      timeout: 10,
    }
  }
}
```

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

### ApiGatewayV1 Changelog

#### Constructor
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

#### Access log
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

#### Custom domain
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
    acmCertificate, // type is `cdk.certificatemanager.Certificate`
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

#### Default settings
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

#### Authorizers
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

#### Routes
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

### Auth Changelog

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

#### Identity pool
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

### Bucket Changelog

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
- notifications: structure changed from `Array[]` ⇒ `Object{}`

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

- addNotifications(): structure changed from `Array[]` ⇒ `Object{}`

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

- attachPermissionsToNotification(): 1st argument `integer` ⇒ `string` (name of the notification)

```js
// from
bucket.attachPermissionsToNotification(0, [...]);
//to
bucket.attachPermissionsToNotification("myNotification", [...]);
```

### Cron Changelog

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

### EventBus Changelog

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

#### Rules
- Moved description ⇒ cdk.rule.description
- Moved enabled ⇒ cdk.rule.enabled
- Moved eventPattern ⇒ cdk.rule.eventPattern
- Moved ruleName ⇒ cdk.rule.ruleName
- Moved schedule ⇒ cdk.rule.schedule

```jsx
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      eventPattern: {
        description,
        enabled,
        eventPattern,
        ruleName,
        schedule,
      },
    },
  },
});

// to
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      cdk: {
        description,
        enabled,
        eventPattern,
        ruleName,
        schedule,
      }
    },
  },
});
```

#### Targets
- targets: structure changed from `Array[]` ⇒ `Object{}`

```js
// from
targets: [
  "src/target1.main"
  "src/target2.main"
]

// to
targets: {
  "0": "src/target1.main",
  "1": "src/target2.main",
}
```

- Moved targetProps ⇒ cdk.target

```js
// from
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      targets: {
        target1: {
          targetProps
        },
      },
    },
  },
});

// to
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      targets: {
        target1: {
          cdk: {
            target
          }
        },
      },
    },
  },
});
```

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

- attachPermissionsToTarget(): 2nd argument type `integer` ⇒ `string` (name of the target)

```js
bus.attachPermissionsToTarget("myRule", 0, [...]);
//to
bus.attachPermissionsToTarget("myRule", "myTarget", [...]);
```

### KinesisStream Changelog

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

#### Consumers
- Always use full props format

```js
// from
consumers: {
  myConsumer: {
    handler: "lambda.main",
    timeout: 10,
  }
}

// to
consumers: {
  myConsumer: {
    function: {
      handler: "lambda.main",
      timeout: 10,
    }
  }
}
```

- Moved consumerProps ⇒ cdk.eventSource
```js
// from
{
  consumerProps: {
    startingPosition: StartingPosition.LATEST,
  }
}
// to
{
  cdk: {
    eventSource: {
      startingPosition: StartingPosition.LATEST,
    },
  },
}
```

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

### Queue Changelog

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

#### Consumer
- Moved consumerProps ⇒ cdk.eventSource
```js
// from
{
  consumerProps: {
    batchSize: 5,
  }
}
// to
{
  cdk: {
    eventSource: {
      batchSize: 5,
    },
  },
}
```

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

### RDS Changelog

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

### Table Changelog

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

- fields: type `TableFieldType` ⇒ `string`

```js
// from
const table = new Table(this, "Notes", {
  fields: {
    noteId: TableFieldType.STRING,
    age: TableFieldType.NUMBER,
    key: TableFieldType.BINARY,
  },
});

// to
const table = new Table(this, "Notes", {
  fields: {
    noteId: "string",
    age: "number",
    key: "binary",
  },
});
```

- globalIndexes[].indexProps ⇒ globalIndexes[].cdk.index
- localIndexes[].indexProps ⇒ localIndexes[].cdk.index

```js
// from
const table = new table(this, "notes", {
  globalindexes: {
    myglobalindex: {
      partitionkey: "userid",
      sortkey: "time",
      indexprops: {
        projectiontype: cdk.dynamodb.projectiontype.all,
      },
    },
  },
  localindexes: {
    mylocalindex: {
      sortkey: "time",
      indexprops: {
        projectiontype: cdk.dynamodb.projectiontype.all,
      },
    },
  },
});

// to
const table = new table(this, "notes", {
  globalindexes: {
    myglobalindex: {
      partitionkey: "userid",
      sortkey: "time",
      cdk: {
        index: {
          projectiontype: cdk.dynamodb.projectiontype.all,
        },
      },
    },
  },
  localindexes: {
    mylocalindex: {
      sortkey: "time",
      cdk: {
        index: {
          projectiontype: cdk.dynamodb.projectiontype.all,
        },
      },
    },
  },
});
```

- stream: type `cdk.dynamodb.StreamViewType` ⇒ `string`

```js
// from
import { StreamViewType } from "aws-cdk-lib/aws-dynamodb";

const table = new Table(this, "Notes", {
  stream: StreamViewType.NEW_IMAGE,
});
// to
const table = new Table(this, "Notes", {
  stream: "new_image",
});
```

#### Consumers
- QueueProps.consumers[ANY].consumerProps ⇒ QueueProps.consumers[ANY].cdk.eventSource
```js
// from
{
  consumerProps: {
    startingPosition: StartingPosition.LATEST,
  }
}
// to
{
  cdk: {
    eventSource: {
      startingPosition: StartingPosition.LATEST,
    },
  },
}
```

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

### Topic Changelog

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

#### Subscribers
- subscribers: structure changed from `Array[]` ⇒ `Object{}`

```js
// from
subscribers: [
  "src/subscriber1.main"
  "src/subscriber2.main"
]

// to
notifications: {
  "0": "src/subscriber1.main",
  "1": "src/subscriber2.main",
}
```

- Moved subscriberProps ⇒ cdk.subscription

```js
// from
new Topic(stack, "Topic", {
  subscribers: {
    mySubscriber: {
      subscriberProps: { ... }
    },
  },
});

// to
new Topic(stack, "Topic", {
  subscribers: {
    mySubscriber: {
      cdk: {
        subscription: { ...  }
      }
    },
  },
});
```

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

- addSubscribers(): structure change from `Array[]` ⇒ `Object{}`.

```js
topic.addSubscribers(stack, [
  "src/subscriber1.main",
  "src/subscriber2.main",
]);

//to
topic.addSubscribers(stack, {
  "0": "src/subscriber1.main",
  "1": "src/subscriber2.main",
});
```

- attachPermissionsToSubscriber(): 1st argument type `integer` ⇒ `string` (name of the subscriber)

```js
// from
topic.attachPermissionsToSubscriber(0, [...]);
//to
topic.attachPermissionsToSubscriber("mySubscriber", [...]);
```

### StaticSite/ReactStaticSite/ViteStaticSite Changelog

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

- errorPage: type `StaticSiteErrorOptions` ⇒ `string`

```js
// from
{
  errorPage: StaticSiteErrorOptions.REDIRECT_TO_INDEX_PAGE,
}
// to
{
  errorPage: "redirect_to_index_page",
}
```

- Moved customDomain.hostedZone (if type is `cdk.route53.HostedZone`) ⇒ customDomain.cdk.hostedZone
- Moved customDomain.certificate (if type is `cdk.certificatemanager.Certificate`) ⇒ customDomain.cdk.certificate

```js
// from
{
  customDomain: {
    hostedZone,     // type is `cdk.route53.HostedZone`
    acmCertificate, // type is `cdk.certificatemanager.Certificate`
  }
}
// to
{
  customDomain: {
    cdk: {
      hostedZone,
      acmCertificate,
    }
  }
}
```

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

### NextjsSite Changelog

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

- Moved customDomain.hostedZone (if type is `cdk.route53.HostedZone`) ⇒ customDomain.cdk.hostedZone
- Moved customDomain.certificate (if type is `cdk.certificatemanager.Certificate`) ⇒ customDomain.cdk.certificate

```js
// from
{
  customDomain: {
    hostedZone,     // type is `cdk.route53.HostedZone`
    acmCertificate, // type is `cdk.certificatemanager.Certificate`
  }
}
// to
{
  customDomain: {
    cdk: {
      hostedZone,
      acmCertificate,
    }
  }
}
```

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
