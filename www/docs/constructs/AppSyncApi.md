---
description: "Docs for the sst.AppSyncApi construct in the @serverless-stack/resources package"
---

The `AppSyncApi` construct is a higher level CDK construct that makes it easy to create an AppSync GraphQL API. It provides a simple way to define the data sources and the resolvers in your API. And allows you to configure the specific Lambda functions if necessary. See the [examples](#examples) for more details.

## Initializer

```ts
new AppSyncApi(scope: Construct, id: string, props: AppSyncApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`AppSyncApiProps`](#appsyncapiprops)

## Examples

The `AppSyncApi` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
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
  graphqlApi: {
    schema: "graphql/schema.graphql",
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
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
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

Note that, you can set the `defaultFunctionProps` while configuring the function per data source. The function will just override the defaultFunctionProps.

```js {5-7,11}
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  defaultFunctionProps: {
    timeout: 20,
  },
  dataSources: {
    notesDS: {
      handler: "src/notes.main",
      timeout: 10,
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
  defaultFunctionProps: {
    timeout: 20,
  },
  resolvers: {
    "Query listNotes": {
      handler: "src/list.main",
      timeout: 10,
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
import * as appsync from "@aws-cdk/aws-appsync";

const notesTable = new Table(this, "Notes", {
  fields: {
    id: TableFieldType.STRING,
  },
  primaryIndex: { partitionKey: "id" },
});

new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  dataSources: {
    tableDS: { table: notesTable },
  },
  resolvers: {
    "Query listNotes": {
      dataSource: "tableDS",
      resolverProps: {
        requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
        responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
      },
    },
  },
});
```

#### Using RDS data source

```js {8-11}
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  dataSources: {
    rdsDS: {
      serverlessCluster: cluster,
      secretStore: secret,
    },
  },
  resolvers: {
    "Query listNotes": {
      dataSource: "rdsDS",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      {
        "version": "2018-05-29",
        "statements": [
          "SELECT * FROM notes"
        ]
      }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.rds.toJsonObject($ctx.result)
      `),
    },
  },
});
```

#### Using HTTP data source

Starting a Step Function execution on the Mutation `callStepFunction`.

```js {8-16}
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  dataSources: {
    httpDS: {
      endpoint: "https://states.amazonaws.com",
      options: {
        authorizationConfig: {
          signingRegion: "us-east-1",
          signingServiceName: "states",
        },
      },
    },
  },
  resolvers: {
    "Mutation callStepFunction": {
      dataSource: "httpDS",
      requestMappingTemplate: MappingTemplate.fromFile("request.vtl"),
      responseMappingTemplate: MappingTemplate.fromFile("response.vtl"),
    },
  },
});
```

### Adding resolvers

Add data sources and resolvers after the API has been created.

#### Adding data sources and resolvers

```js {14-20}
const api = new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
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
  graphqlApi: {
    schema: "graphql/schema.graphql",
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
  graphqlApi: {
    schema: "graphql/schema.graphql",
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
import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
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
});
```

#### Using Cognito User Pool

```js {6-13}
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
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
});
```

#### Using AWS IAM

```js {6-10}
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
    authorizationConfig: {
      defaultAuthorization: {
        authorizationType: appsync.AuthorizationType.IAM,
      },
    },
  },
});
```

#### Using OpenID Connect

```js {6-13}
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
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
});
```

### Configuring the GraphQL Api

Configure the internally created CDK `GraphqlApi` instance.

```js {3-8}
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    name: "My GraphQL API",
    logConfig: {
      excludeVerboseContent: false,
      fieldLogLevel: appsync.FieldLogLevel.ALL,
    },
    xrayEnabled: false,
  },
});
```

### Configuring data source

```js {11-13}
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  dataSources: {
    notesDS: {
      function: {
        handler: "src/notes.main",
        timeout: 10,
      },
      options: {
        name: "Notes Data Source",
      },
    },
  },
});
```

### Configuring resolver

```js {11-14}
new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  resolvers: {
    "Query listNotes": {
      function: {
        handler: "src/notes.main",
        timeout: 10,
      },
      resolverProps: {
        requestMappingTemplate: MappingTemplate.fromFile("request.vtl"),
        responseMappingTemplate: MappingTemplate.fromFile("response.vtl"),
      },
    },
  },
});
```

### Importing an existing GraphQL Api

Override the internally created CDK `GraphqlApi` instance.

```js {7-10}
import * as appsync from "@aws-cdk/aws-appsync";

new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: appsync.GraphqlApi.fromGraphqlApiAttributes(this, "IGraphqlApi", {
    graphqlApiId,
  }),
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Mutation createNote": "src/create.main",
  },
});
```

### Attaching permissions

You can attach a set of permissions to all or some of the routes.

#### For the entire API

Allow the entire API to access S3.

```js {14}
const api = new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
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

Allow one of the data source to access S3.

```js {11}
const api = new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
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
  graphqlApi: {
    schema: "graphql/schema.graphql",
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

const listFunction = api.getFunction("notesDS");
const dataSource = api.getDataSource("notesDS");
const resolver = api.getResolver("Mutation charge");
```

#### For an auto-created data source

Allow one of the resolvers to access S3.

```js {11-13}
const api = new AppSyncApi(this, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
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

## Properties

An instance of `AppSyncApi` contains the following properties.

### graphqlApi

_Type_: [`cdk.aws-appsync.GraphqlApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.GraphqlApi.html)

The internally created CDK `AppSyncApi` instance.

## Methods

An instance of `Api` contains the following methods.

### getFunction

```ts
getFunction(key: string): Function
```

_Parameters_

- **key** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given data source key. Where the `key` is the key used to define a data source. For example, `lambdaDS`.

For auto-created Lambda data sources, pass in the key used to defined a resolver. For example, `Query listNotes`.

### getDataSource

```ts
getDataSource(key: string): BaseDataSource
```

_Parameters_

- **key** `string`

_Returns_

- [`cdk.aws-appsync.BaseDataSource`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.BaseDataSource.html)

Get the instance of the internally created data source. Where the `key` is the key used to define a data source. For example, `lambdaDS`.

For auto-created Lambda data sources, pass in the key used to defined a resolver. For example, `Query listNotes`.

### getResolver

```ts
getResolver(key: string): Resolver
```

_Parameters_

- **key** `string`

_Returns_

- [`cdk.aws-appsync.Resolver`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.Resolver.html)

Get the instance of the internally created resolver. Where the `key` is the key used to defined a resolver. For example, `Query listNotes`.

### addDataSources

```ts
addDataSources(scope: cdk.Construct, dataSources: { [key: string]: FunctionDefinition | ApiRouteProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **dataSources** `{ [key: string]: FunctionDefinition | AppSyncApiLambdaDataSourceProps | AppSyncApiDynamoDbDataSourceProps | AppSyncApiRdsDataSourceProps | AppSyncApiHttpDataSourceProps }`

An associative array with the key being the name as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or one of the [AppSyncApiLambdaDataSourceProps](#appsyncapilambdadatasourceprops), [AppSyncApiDynamoDbDataSourceProps](#appsyncapidynamodbdatasourceprops), [AppSyncApiRdsDataSourceProps](#appsyncapirdsdatasourceprops), or [AppSyncApiHttpDataSourceProps](#appsyncapihttpdatasourceprops).

### addResolvers

```ts
addResolvers(scope: cdk.Construct, resolvers: { [key: string]: string | FunctionDefinition | AppSyncApiResolverProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **resolvers** `{ [key: string]: string | FunctionDefinition | AppSyncApiResolverProps }`

An associative array with the key being the type name and field name as a string and the value is either a `string`, the [`FunctionDefinition`](Function.md#functiondefinition) or the [`AppSyncApiResolverProps`](#appsyncapiresolverprops).

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the routes. This allows the functions to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToDataSource

```ts
attachPermissionsToDataSource(key: string, permissions: Permissions)
```

_Parameters_

- **key** `string`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific data source. This allows that function to access other AWS resources.

Pass in the key used to define a data source. For example, `lambdaDS`. Or for auto-created Lambda data sources, pass in the key used to defined a resolver. For example, `Query listNotes`.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## AppSyncApiProps

### dataSources?

_Type_ : `{ [key: string]: FunctionDefinition | AppSyncApiLambdaDataSourceProps | AppSyncApiDynamoDbDataSourceProps | AppSyncApiRdsDataSourceProps | AppSyncApiHttpDataSourceProps }`, _defaults to_ `{}`

The data sources for this API. Takes an associative array, with the key being the name as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition).

```js
{
  lambdaDataSource: "src/list.main",
}
```

Or one of the [AppSyncApiLambdaDataSourceProps](#appsyncapilambdadatasourceprops), [AppSyncApiDynamoDbDataSourceProps](#appsyncapidynamodbdatasourceprops), [AppSyncApiRdsDataSourceProps](#appsyncapirdsdatasourceprops), or [AppSyncApiHttpDataSourceProps](#appsyncapihttpdatasourceprops).

```js
{
  lambdaDataSource: {
    function: "src/list.main",
    options: {
      name: "Lambda DS",
    },
  }
}
```

### resolvers?

_Type_ : `{ [key: string]: string | FunctionDefinition | AppSyncApiResolverProps }`, _defaults to_ `{}`

The resolvers for this API. Takes an associative array, with the key being the type name and field name as a string and the value is either a `string` with the name of an existing data source.

```js
{
  "Query listNotes": "lambdaDS",
}
```

A [`FunctionDefinition`](Function.md#functiondefinition). And the data source is automatically created.

```js
{
  "Query listNotes": "src/list.main",
}
```

Or the [AppSyncApiResolverProps](#appsyncapiresolverprops).

```js
{
  "Query listNotes": {
    dataSource: "dynamoDbDataSource",
    resolverProps: {
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    },
  }
}
```

### graphqlApi?

_Type_ : `cdk.aws-appsync.IGraphqlApi | AppSyncApiCdkGraphqlProps`], _defaults to_ `undefined`

Optionally, pass in an instance of the CDK [`cdk.aws-appsync.IGraphqlApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.IGraphqlApi.html) or [`AppSyncApiCdkGraphqlProps`](#appsyncapicdkgraphqlprops). This will override the default settings this construct uses to create the CDK `GraphqlApi` internally.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `function` is specified for a data source, these default values are overridden.

## AppSyncApiLambdaDataSourceProps

### function

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create this data source.

### options?

_Type_ : [`cdk.aws-appsync.DataSourceOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.DataSourceOptions.html)

The optional configuration for this data source.

## AppSyncApiDynamoDbDataSourceProps

### table

_Type_ : `Table | cdk.aws-dynamodb.Table`

The DynamoDB table used to create this data source. Takes a [`Tabel`](Table.md#table) or a [`cdk.aws-dynamodb.Table`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-dynamodb.Table.html).

### options?

_Type_ : [`cdk.aws-appsync.DataSourceOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.DataSourceOptions.html)

The optional configuration for this data source.

## AppSyncApiRdsDataSourceProps

### serverlessCluster

_Type_ : [`cdk.aws-rds.IServerlessCluster`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-rds.IServerlessCluster.html)

The serverless cluster to interact with this data source.

### secretStore

_Type_ : [`cdk.aws-secretsmanager.ISecret`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-secretsmanager.ISecret.html)

The secret store that contains the username and password for the serverless cluster.

### databaseName?

_Type_ : `string`

The optional name of the database to use within the cluster.

### options?

_Type_ : [`cdk.aws-appsync.DataSourceOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.DataSourceOptions.html)

The optional configuration for this data source.

## AppSyncApiHttpDataSourceProps

### endpoint

_Type_ : `string`

The http endpoint used to create this data source.

### options?

_Type_ : [`cdk.aws-appsync.HttpDataSourceOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.HttpDataSourceOptions.html)

The optional configuration for this data source.

## AppSyncApiResolverProps

### dataSource?

_Type_ : `string`, _defaults to `undefined`_

The data source for this resolver. The data source must be already created.

### function?

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the data source for this resolver.

### resolverProps?

_Type_ : [`AppSyncApiCdkResolverProps`](#appsyncapicdkresolverprops), _defaults to_ `undefined`

Or optionally pass in a `AppSyncApiCdkResolverProps`. This allows you to override the default settings this construct uses internally to create the resolver.

## AppSyncApiCdkGraphqlProps

`AppSyncApiCdkGraphqlProps` extends [`cdk.aws-appsync.GraphqlApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.GraphqlApiProps.html) with the following exceptions.

### name?

The `name` field is **optional**.

### schema?

_Type_ : `string | appsync.Schema`, _defaults to `undefined`_

Pass in the path to the schema attached to this api. Takes a `string` and it will be converted to the [`cdk.aws-appsync.Schema`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.Schema.html) object.

```ts
{
  schema: appsync.Schema.fromAsset(schema);
}
```

### xrayEnabled?

_Type_ : `boolean`, _defaults to `true`_

A flag indicating whether or not X-Ray tracing is enabled for this api.

## AppSyncApiCdkResolverProps

`AppSyncApiCdkResolverProps` extends [`cdk.aws-appsync.BaseResolverProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-appsync.BaseResolverProps.html) with the exception that the `fieldName` and the `typeName` fields are **not accepted**. The field name and the type name should be configured using the keys of [`resolvers`](#resolvers) field.

You can use `AppSyncApiCdkResolverProps` to configure the other resolver properties.
