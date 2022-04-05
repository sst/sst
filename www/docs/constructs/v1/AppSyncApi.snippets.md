### Data source: Function

#### Auto-creating Lambda data sources

If the data sources are not configured, a Lambda data source is automatically created for each resolver.

```js
new AppSyncApi(this, "GraphqlApi", {
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
new AppSyncApi(this, "GraphqlApi", {
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
new AppSyncApi(this, "GraphqlApi", {
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
new AppSyncApi(this, "GraphqlApi", {
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
const api = new AppSyncApi(this, "GraphqlApi", {
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
const api = new AppSyncApi(this, "GraphqlApi", {
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
const api = new AppSyncApi(this, "GraphqlApi", {
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
new AppSyncApi(this, "GraphqlApi", {
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
const api = new AppSyncApi(this, "GraphqlApi", {
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
const api = new AppSyncApi(this, "GraphqlApi", {
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
import { MappingTemplate } from "@aws-cdk/aws-appsync-alpha";

const notesTable = new Table(this, "Notes", {
  fields: {
    id: "string"
  },
  primaryIndex: { partitionKey: "id" },
});

new AppSyncApi(this, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    tableDS: {
      type: "dynamodb",
      table: notesTable
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
new AppSyncApi(this, "GraphqlApi", {
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

### Data source: HTTP

Starting a Step Function execution on the Mutation `callStepFunction`.

```js {4-15}
new AppSyncApi(this, "GraphqlApi", {
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

### Wroking with resolvers

You can also add data sources and resolvers after the API has been created.

#### Adding data sources and resolvers

```js {12-18}
const api = new AppSyncApi(this, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Mutation createNote": "notesDS",
  },
});

api.addDataSources(this, {
  billingDS: "src/billing.main",
});

api.addResolvers(this, {
  "Mutation charge": "billingDS",
});
```

#### Auto-creating Lambda data sources

```js {10-13}
const api = new AppSyncApi(this, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
  },
});

api.addResolvers(this, {
  "Mutation updateNote": "src/update.main",
  "Mutation deleteNote": "src/delete.main",
});
```

#### Lazily adding resolvers

```js {5-8}
const api = new AppSyncApi(this, "GraphqlApi", {
  schema: "graphql/schema.graphql",
});

api.addResolvers(this, {
  "Query    listNotes": "src/list.main",
  "Mutation createNote": "src/create.main",
});
```

#### Getting the function for a resolver

```js {18}
const api = new AppSyncApi(this, "GraphqlApi", {
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

### Authorization

#### Using API Key

```js {8-15}
import * as cdk from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
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

```js {7-14}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
  schema: "graphql/schema.graphql",
  cdk: {
    graphqlApi: {
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: userPool,
          },
        },
      },
    },
  },
});
```

#### Using AWS IAM

```js {7-11}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
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
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
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

### Advanced examples

#### Configuring the GraphQL Api

Configure the internally created CDK `GraphqlApi` instance.

```js {6-11}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
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
import { GraphqlApi } from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: GraphqlApi.fromGraphqlApiAttributes(this, "IGraphqlApi", {
      graphqlApiId,
    }),
  },
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});
```
