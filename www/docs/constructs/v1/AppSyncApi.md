---
description: "Docs for the sst.AppSyncApi construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->


## Constructor
```ts
new AppSyncApi(scope: Construct, id: string, props: AppSyncApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`AppSyncApiProps`](#appsyncapiprops)
## Properties
An instance of `AppSyncApi` has the following properties.
### url

_Type_ : `string`


### cdk.graphqlApi

_Type_ : [`GraphqlApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-appsync-alpha.GraphqlApi.html)

The internally created appsync api


## Methods
An instance of `AppSyncApi` has the following methods.
### addDataSources

```ts
addDataSources(scope: Construct, dataSources: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __dataSources__ 



Add data sources after the construct has been created

#### Examples

```js
api.addDataSources(props.stack, {
  billingDS: "src/billing.main",
});
```

### addResolvers

```ts
addResolvers(scope: Construct, resolvers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __resolvers__ 



Add resolvers the construct has been created

#### Examples

```js
api.addResolvers(this, {
  "Mutation charge": "billingDS",
});
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to all function datasources

#### Examples


```js
api.attachPermissions(["s3"]);
```

### attachPermissionsToDataSource

```ts
attachPermissionsToDataSource(key: string, permissions: Permissions)
```
_Parameters_
- __key__ `string`
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to a specific function datasource. This allows that function to access other AWS resources.

#### Examples

api.attachPermissionsToRoute("Mutation charge", ["s3"]);
```

### getDataSource

```ts
getDataSource(key: string)
```
_Parameters_
- __key__ `string`


Get a datasource by name

#### Examples

```js
api.getDataSource("billingDS");
```

### getFunction

```ts
getFunction(key: string)
```
_Parameters_
- __key__ `string`


Get the instance of the internally created Function, for a given resolver.

#### Examples

```js
const func = api.getFunction("Mutation charge");
```

### getResolver

```ts
getResolver(key: string)
```
_Parameters_
- __key__ `string`


Get a resolver

#### Examples

```js
api.getResolver("Mutation charge");
```

## AppSyncApiProps


### dataSources?

_Type_ : Record<`string`, [`FunctionInlineDefinition`](Function)&nbsp; | &nbsp;[`AppSyncApiLambdaDataSourceProps`](#appsyncapilambdadatasourceprops)&nbsp; | &nbsp;[`AppSyncApiDynamoDbDataSourceProps`](#appsyncapidynamodbdatasourceprops)&nbsp; | &nbsp;[`AppSyncApiRdsDataSourceProps`](#appsyncapirdsdatasourceprops)&nbsp; | &nbsp;[`AppSyncApiHttpDataSourceProps`](#appsyncapihttpdatasourceprops)>

Define datasources. Can be a function, dynamodb table, rds cluster or http endpoint

#### Examples

```js
new AppSyncApi(this, "GraphqlApi", {
  dataSources: {
    notes: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notes",
  },
});
```


### defaults.function?

_Type_ : [`FunctionProps`](Function)

The default function props to be applied to all the Lambda functions in the AppSyncApi. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new AppSyncApi(props.stack, "AppSync", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
});
```


### resolvers?

_Type_ : Record<`string`, [`FunctionInlineDefinition`](Function)&nbsp; | &nbsp;[`AppSyncApiResolverProps`](#appsyncapiresolverprops)>

The resolvers for this API. Takes an object, with the key being the type name and field name as a string and the value is either a string with the name of existing data source.

#### Examples

```js
new AppSyncApi(this, "GraphqlApi", {
  resolvers: {
    "Query    listNotes": "src/list.main",
    "Query    getNoteById": "src/get.main",
    "Mutation createNote": "src/create.main",
    "Mutation updateNote": "src/update.main",
    "Mutation deleteNote": "src/delete.main",
  },
});
```


### cdk.graphqlApi?

_Type_ : [`IGraphqlApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-appsync-alpha.IGraphqlApi.html)&nbsp; | &nbsp;[`AppSyncApiCdkGraphqlProps`](#appsyncapicdkgraphqlprops)


## AppSyncApiResolverProps
Used to define full resolver config

### dataSource?

_Type_ : `string`

The name of the data source

### function?

_Type_ : [`FunctionDefinition`](Function)

Function to invoke for the resolver

### requestMapping?

_Type_ : [`MappingTemplate`](MappingTemplate)

VTL request mapping template
DOCTODO: can probably use examples

### responseMapping?

_Type_ : [`MappingTemplate`](MappingTemplate)

VTL response mapping template
DOCTODO: can probably use examples


### cdk.resolver

_Type_ : Omit<[`ResolverProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-appsync-alpha.ResolverProps.html), `"api"`&nbsp; | &nbsp;`"fieldName"`&nbsp; | &nbsp;`"typeName"`&nbsp; | &nbsp;`"dataSource"`>


## AppSyncApiCdkGraphqlProps


### name?

_Type_ : `string`

### schema?

_Type_ : `string`&nbsp; | &nbsp;Array< `string` >&nbsp; | &nbsp;[`Schema`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-appsync-alpha.Schema.html)

## AppSyncApiRdsDataSourceProps
Used to define a lambda data source

### Examples

```js
new AppSyncApi(this, "AppSync", {
  dataSources: {
    rds: {
      type: "rds",
      table: MyRDSCluster
    },
  },
});
```

### databaseName?

_Type_ : `string`

The name of the database to connect to

### description?

_Type_ : `string`

Description of the data source

### name?

_Type_ : `string`

Name of the data source

### rds?

_Type_ : [`RDS`](RDS)

Target RDS construct

### type

_Type_ : `"rds"`

String literal to signify that this data source is an RDS database



### cdk.dataSource.databaseName?

_Type_ : `string`

### cdk.dataSource.secretStore

_Type_ : [`ISecret`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISecret.html)

### cdk.dataSource.serverlessCluster

_Type_ : [`IServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IServerlessCluster.html)



## AppSyncApiHttpDataSourceProps
Used to define an http data source

### Examples

```js
new AppSyncApi(this, "AppSync", {
  dataSources: {
    http: {
      type: "http",
      endpoint: "https://example.com"
    },
  },
});
```

### description?

_Type_ : `string`

Description of the data source

### endpoint

_Type_ : `string`

URL to forward requests to

### name?

_Type_ : `string`

Name of the data source

### type

_Type_ : `"http"`

String literal to signify that this data source is an HTTP endpoint



### cdk.dataSource.authorizationConfig?

_Type_ : [`AwsIamConfig`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-appsync-alpha.AwsIamConfig.html)



## AppSyncApiLambdaDataSourceProps
Used to define a lambda data source

### Examples

```js
new AppSyncApi(this, "AppSync", {
  dataSources: {
    lambda: {
      type: "function",
      function: "src/function.handler"
    },
  },
});
```


### description?

_Type_ : `string`

Description of the data source

### function

_Type_ : [`FunctionDefinition`](Function)

Function definition

### name?

_Type_ : `string`

Name of the data source

### type?

_Type_ : `"function"`

String literal to signify that this data source is a function

## AppSyncApiDynamoDbDataSourceProps
Used to define a lambda data source

### Examples

```js
new AppSyncApi(this, "AppSync", {
  dataSources: {
    table: {
      type: "table",
      table: MyTable
    },
  },
});
```

### description?

_Type_ : `string`

Description of the data source

### name?

_Type_ : `string`

Name of the data source

### table?

_Type_ : [`Table`](Table)

Target table

### type

_Type_ : `"dynamodb"`

String literal to signify that this data source is a dynamodb table



### cdk.dataSource.table

_Type_ : [`Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Table.html)


