### Using the minimal config

```js
import { AppSyncApi } from "@serverless-stack/resources";

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

### Auto-creating Lambda data sources

If the data sources are not configured, a Lambda data source is automatically created for each resolver.

```js
new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
    "Mutation updateNote": "src/update.main",
    "Mutation deleteNote": "src/delete.main",
  },
});
```

### Specifying function props for all the data sources

You can set some function props and have them apply to all the Lambda data sources.

```js {5-8}
new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

```js {5-7,11}
new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

```js {5-7,11}
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
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

### Using multiple data sources

```js {5-8}
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
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

### Using other data sources

#### Using DynamoDB data source

```js {15}
import { MappingTemplate } from "@aws-cdk/aws-appsync-alpha";

const notesTable = new Table(this, "Notes", {
  fields: {
    id: "string"
  },
  primaryIndex: { partitionKey: "id" },
});

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

#### Using RDS data source

```js {8-11}
new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

#### Using HTTP data source

Starting a Step Function execution on the Mutation `callStepFunction`.

```js {8-16}
new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

### Adding resolvers

You can also add data sources and resolvers after the API has been created.

#### Adding data sources and resolvers

```js {14-20}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
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

api.addDataSources(this, {
  billingDS: "src/billing.main",
});

api.addResolvers(this, {
  "Mutation charge": "billingDS",
});
```

#### Auto-creating Lambda data sources

```js {12-15}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

```js {7-10}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
});

api.addResolvers(this, {
  "Query    listNotes": "src/list.main",
  "Mutation createNote": "src/create.main",
});
```

### Configuring Auth

#### Using API Key

```js {7-14}
import * as cdk from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
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

```js {6-13}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
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

```js {6-10}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
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

```js {6-13}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
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

### Configuring the GraphQL Api

Configure the internally created CDK `GraphqlApi` instance.

```js {5-10}
import * as appsync from "@aws-cdk/aws-appsync-alpha";

new AppSyncApi(this, "GraphqlApi", {
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

### Importing an existing GraphQL Api

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

### Attaching permissions

You can attach a set of permissions to all or some of the Lambda functions.

#### For the entire API

Allow the entire API to access S3.

```js {14}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

#### For a specific data source

Allow one of the data sources to access S3.

```js {11}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
  dataSources: {
    notesDS: "src/notes.main",
    billingDS: "src/billing.main",
  },
});

api.attachPermissionsToDataSource("billingDS", ["s3"]);
```

#### For an auto-created data source

Allow one of the resolvers to access S3.

```js {11}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});

api.attachPermissionsToDataSource("Query listNotes", ["s3"]);
```

### Getting the data source and resolver

#### For explicitly configured data source

```js {16-18}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
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

const listFunction = api.getFunction("notesDS");
const dataSource = api.getDataSource("notesDS");
const resolver = api.getResolver("Mutation charge");
```

#### For an auto-created data source

```js {11-13}
const api = new AppSyncApi(this, "GraphqlApi", {
  cdk: {
    graphqlApi: {
      schema: "graphql/schema.graphql",
    },
  },
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});

const listFunction = api.getFunction("Query listNotes");
const dataSource = api.getDataSource("Query listNotes");
const resolver = api.getResolver("Query listNotes");
```
