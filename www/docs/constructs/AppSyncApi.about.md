The `AppSyncApi` construct is a higher level CDK construct that makes it easy to create an AppSync GraphQL API. It provides a simple way to define the data sources and the resolvers in your API. And allows you to configure the specific Lambda functions if necessary. See the [examples](#examples) for more details.

Using this construct requires two additional dependencies. Make sure you install `graphql` and `@graphql-tools/merge` for schema merging

## Examples

### Using the minimal config

```js
import { AppSyncApi } from "sst/constructs";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Query    getNoteById": "notesDS",
    "Mutation createNote": "notesDS",
    "Mutation updateNote": "notesDS",
    "Mutation deleteNote": "notesDS",
  },
});
```

Note that, the resolver key can have extra spaces in between, they are just ignored.

### Data source: Function

#### Auto-creating Lambda data sources

If the data sources are not configured, a Lambda data source is automatically created for each resolver.

```js
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
    "Mutation updateNote": "src/update.main",
    "Mutation deleteNote": "src/delete.main",
  },
});
```

#### Specifying function props for all the data sources

You can set some function props and have them apply to all the Lambda data sources.

```js {4-7}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: "NOTES_TABLE" },
    },
  },
  dataSources: {
    notesDS: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Mutation createNote": "notesDS",
  },
});
```

Note that, you can set the `defaultFunctionProps` while configuring the function per data source. The function one will just override the `defaultFunctionProps`.

```js {4-6,12}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  defaults: {
    function: {
      timeout: 20,
    },
  },
  dataSources: {
    notesDS: {
      function: {
        handler: "src/notes.main",
        timeout: 10,
      },
    },
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Mutation createNote": "notesDS",
  },
});
```

So in the above example, the `notesDS` data source doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`).

Similarly, the `defaultFunctionProps` also applies when the Lambda data sources are auto-created.

```js {4-6,10}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  defaults: {
    function: {
      timeout: 20,
    },
  },
  resolvers: {
    "Query listNotes": {
      function: {
        handler: "src/list.main",
        timeout: 10,
      },
    },
    "Mutation createNote": "src/create.main",
  },
});
```

#### Attaching permissions for the entire API

Allow the entire API to access S3.

```js {12}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
    "Mutation updateNote": "src/update.main",
    "Mutation deleteNote": "src/delete.main",
  },
});

api.attachPermissions(["s3"]);
```

#### Attaching permissions for a specific route

Allow one of the data sources to access S3.

```js {9}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
    billingDS: "src/billing.main",
  },
});

api.attachPermissionsToDataSource("billingDS", ["s3"]);
```

#### Attaching permissions for an auto-created data source

Allow one of the resolvers to access S3.

```js {9}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});

api.attachPermissionsToDataSource("Query listNotes", ["s3"]);
```

#### Using multiple data sources

```js {4-5}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
    billingDS: "src/billing.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Mutation createNote": "notesDS",
    "Mutation charge": "billingDS",
  },
});
```

#### Getting the function for a data source

```js {9-10}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
    billingDS: "src/billing.main",
  },
});

const listFunction = api.getFunction("notesDS");
const dataSource = api.getDataSource("notesDS");
```

#### Getting the function for a auto-created data source

```js {9-10}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});

const listFunction = api.getFunction("Query listNotes");
const dataSource = api.getDataSource("Query listNotes");
```

### Data source: DynamoDB

```js {14}
import { MappingTemplate } from "aws-cdk-lib/aws-appsync";

const notesTable = new Table(stack, "Notes", {
  fields: {
    id: "string",
  },
  primaryIndex: { partitionKey: "id" },
});

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    tableDS: {
      type: "dynamodb",
      table: notesTable,
    },
  },
  resolvers: {
    "Query listNotes": {
      dataSource: "tableDS",
      cdk: {
        resolver: {
          requestMappingTemplate: MappingTemplate.dynamoDbScanTable(),
          responseMappingTemplate: MappingTemplate.dynamoDbResultList(),
        },
      },
    },
  },
});
```

### Data source: RDS

```js {4-7}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    rdsDS: {
      type: "rds",
      rds: cluster,
    },
  },
  resolvers: {
    "Query listNotes": {
      dataSource: "rdsDS",
      requestMapping: {
        inline: `
          {
            "version": "2018-05-29",
            "statements": [
              "SELECT * FROM notes"
            ]
          }
        `,
      },
      responseMapping: {
        inline: `$util.rds.toJsonObject($ctx.result)`,
      },
    },
  },
});
```

### Data source: OpenSearch

```js {6-17}
import { Domain } from "aws-cdk-lib/aws-opensearchservice";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    searchDS: {
      type: "open_search",
      cdk: {
        dataSource: {
          domain: Domain.fromDomainEndpoint(
            stack,
            "IDomain",
            "https://search-test-domain-1234567890.us-east-1.es.amazonaws.com"
          )
        }
      }
    },
  },
  resolvers: {
    "Query listNotes": {
      dataSource: "searchDS",
      requestMappingTemplate: appsync.MappingTemplate.fromString(JSON.stringify({
        version: '2017-02-28',
        operation: 'GET',
        path: '/id/post/_search',
        params: {
          headers: {},
          queryString: {},
          body: { from: 0, size: 50 },
        },
      })),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`[
        #foreach($entry in $context.result.hits.hits)
        #if( $velocityCount > 1 ) , #end
        $utils.toJson($entry.get("_source"))
        #end
      ]`),
    },
  },
});
```

### Data source: HTTP

Starting a Step Function execution on the Mutation `callStepFunction`.

```js {4-15}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    httpDS: {
      type: "http",
      endpoint: "https://states.amazonaws.com",
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
  resolvers: {
    "Mutation callStepFunction": {
      dataSource: "httpDS",
      requestMapping: { file: "request.vtl" },
      responseMapping: { file: "response.vtl" },
    },
  },
});
```

### Configuring resolvers

You can also add data sources and resolvers after the API has been created.

#### Adding data sources and resolvers

```js {12-18}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Mutation createNote": "notesDS",
  },
});

api.addDataSources(stack, {
  billingDS: "src/billing.main",
});

api.addResolvers(stack, {
  "Mutation charge": "billingDS",
});
```

#### Auto-creating Lambda data sources

```js {10-13}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
  },
});

api.addResolvers(stack, {
  "Mutation updateNote": "src/update.main",
  "Mutation deleteNote": "src/delete.main",
});
```

#### Lazily adding resolvers

```js {5-8}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
});

api.addResolvers(stack, {
  "Query    listNotes": "src/list.main",
  "Mutation createNote": "src/create.main",
});
```

#### Getting the function for a resolver

```js {18}
const api = new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
    billingDS: "src/billing.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Mutation createNote": "notesDS",
    "Mutation charge": "billingDS",
  },
});

const resolver = api.getResolver("Mutation charge");
```

### Custom domains

You can configure the API with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#using-externally-hosted-domain).

#### Using the basic config

```js {3}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  customDomain: "api.domain.com",
});
```

#### Using the full config

```js {3-6}
new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    recordType: "A_AAAA",
  },
});
```

#### Importing an existing certificate

```js {8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  customDomain: {
    domainName: "api.domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

#### Specifying a hosted zone

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {8-11}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  customDomain: {
    domainName: "api.domain.com",
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, "MyZone", {
        hostedZoneId,
        zoneName,
      }),
    },
  },
});
```

#### Loading domain name from SSM parameter

If you have the domain name stored in AWS SSM Parameter Store, you can reference the value as the domain name:

```js {3,8-9}
import { StringParameter } from "aws-cdk-lib/aws-ssm";

const rootDomain = StringParameter.valueForStringParameter(
  stack,
  `/myApp/domain`
);

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  customDomain: {
    domainName: `api.${rootDomain}`,
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, "MyZone", {
        hostedZoneId,
        zoneName,
      }),
    },
  },
});
```

Note that, normally SST will look for a hosted zone by stripping out the first part of the `domainName`. But this is not possible when the `domainName` is a reference. So you'll need to specify the `cdk.hostedZone` explicitly.

#### Using externally hosted domain

```js {6-10}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  customDomain: {
    isExternalDomain: true,
    domainName: "api.domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
});
```

Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Authorization

#### Using API Key

```js {8-15}
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
    },
  },
});
```

#### Using Cognito User Pool

```js {11-18}
import * as appsync from "aws-cdk-lib/aws-appsync";
import { Auth, AppSyncApi } from "sst/constructs";

// Create a User Pool using the Auth construct
const auth = new Cognito(stack, "Auth");

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: auth.cdk.userPool,
          },
        },
      },
    },
  },
});
```

#### Using AWS IAM

```js {7-11}
import * as appsync from "aws-cdk-lib/aws-appsync";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.IAM,
        },
      },
    },
  },
});
```

#### Using OpenID Connect

```js {7-14}
import * as appsync from "aws-cdk-lib/aws-appsync";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.OIDC,
          openIdConnectConfig: {
            oidcProvider: "https://myorg.us.auth0.com",
          },
        },
      },
    },
  },
});
```

#### Using Lambda

```js {12-19}
import * as appsync from "aws-cdk-lib/aws-appsync";
import { Function, AppSyncApi } from "sst/constructs";

const authorizer = new Function(stack, "AuthorizerFn", {
  handler: "src/authorizer.main",
});

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.LAMBDA,
          lambdaAuthorizerConfig: {
            handler: authorizer,
          },
        },
      },
    },
  },
});
```

#### Using multiple authorization methods

```js {8-20}
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
    },
  },
});
```

### Advanced examples

#### Configuring the GraphQL Api

Configure the internally created CDK `GraphqlApi` instance.

```js {6-11}
import * as appsync from "aws-cdk-lib/aws-appsync";

new AppSyncApi(stack, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      name: "My GraphQL API",
      logConfig: {
        excludeVerboseContent: false,
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      xrayEnabled: false,
    },
  },
});
```

#### Importing an existing GraphQL Api

Override the internally created CDK `GraphqlApi` instance.

```js {7-10}
import { GraphqlApi } from "aws-cdk-lib/aws-appsync";

new AppSyncApi(stack, "GraphqlApi", {
  cdk: {
    graphqlApi: GraphqlApi.fromGraphqlApiAttributes(stack, "IGraphqlApi", {
      graphqlApiId,
    }),
  },
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});
```
