---
description: "Docs for the sst.AppSyncApi construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new AppSyncApi(scope: Construct, id: string, props: AppSyncApiProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`AppSyncApiProps`](#appsyncapiprops)
## Properties
An instance of `AppSyncApi` has the following properties.
### graphqlApi

_Type_ : [`GraphqlApi`](GraphqlApi)

### url

_Type_ : `string`

## Methods
An instance of `AppSyncApi` has the following methods.
### addDataSources

```ts
addDataSources(scope: Construct, dataSources: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- dataSources unknown
### addResolvers

```ts
addResolvers(scope: Construct, resolvers: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- resolvers unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToDataSource

```ts
attachPermissionsToDataSource(key: string, permissions: Permissions)
```
_Parameters_
- key `string`
- permissions [`Permissions`](Permissions)
### getDataSource

```ts
getDataSource(key: string)
```
_Parameters_
- key `string`
### getFunction

```ts
getFunction(key: string)
```
_Parameters_
- key `string`
### getResolver

```ts
getResolver(key: string)
```
_Parameters_
- key `string`
## AppSyncApiCdkGraphqlProps
### authorizationConfig

_Type_ : [`AuthorizationConfig`](AuthorizationConfig)

(experimental) Optional authorization configuration.
- API Key authorization


### logConfig

_Type_ : [`LogConfig`](LogConfig)

(experimental) Logging configuration for this api.
- None


### name

_Type_ : `string`

### schema

_Type_ : `string`&nbsp; | &nbsp;unknown&nbsp; | &nbsp;[`Schema`](Schema)

### xrayEnabled

_Type_ : `boolean`

(experimental) A flag indicating whether or not X-Ray tracing is enabled for the GraphQL API.
- false


## AppSyncApiDynamoDbDataSourceProps
### options

_Type_ : [`DataSourceOptions`](DataSourceOptions)

### table

_Type_ : [`Table`](Table)&nbsp; | &nbsp;[`Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Table.html)

## AppSyncApiHttpDataSourceProps
### endpoint

_Type_ : `string`

### options

_Type_ : [`HttpDataSourceOptions`](HttpDataSourceOptions)

## AppSyncApiLambdaDataSourceProps
### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### options

_Type_ : [`DataSourceOptions`](DataSourceOptions)

## AppSyncApiProps
### dataSources

_Type_ : unknown

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### graphqlApi

_Type_ : [`IGraphqlApi`](IGraphqlApi)&nbsp; | &nbsp;[`AppSyncApiCdkGraphqlProps`](#appsyncapicdkgraphqlprops)

### resolvers

_Type_ : unknown

## AppSyncApiRdsDataSourceProps
### databaseName

_Type_ : `string`

### options

_Type_ : [`DataSourceOptions`](DataSourceOptions)

### secretStore

_Type_ : [`ISecret`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISecret.html)

### serverlessCluster

_Type_ : [`IServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IServerlessCluster.html)

## AppSyncApiResolverProps
### dataSource

_Type_ : `string`

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### resolverProps

_Type_ : [`Omit`](Omit)
