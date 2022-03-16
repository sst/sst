---
description: "Docs for the sst.AppSyncApi construct in the @serverless-stack/resources package"
---


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

### cdk.graphqlApi

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
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __dataSources__ 

### addResolvers

```ts
addResolvers(scope: Construct, resolvers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __resolvers__ 

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToDataSource

```ts
attachPermissionsToDataSource(key: string, permissions: Permissions)
```
_Parameters_
- __key__ `string`
- __permissions__ [`Permissions`](Permissions)
### getDataSource

```ts
getDataSource(key: string)
```
_Parameters_
- __key__ `string`
### getFunction

```ts
getFunction(key: string)
```
_Parameters_
- __key__ `string`
### getResolver

```ts
getResolver(key: string)
```
_Parameters_
- __key__ `string`
## AppSyncApiBaseDataSourceProps
### description

_Type_ : `string`

### name

_Type_ : `string`

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

_Type_ : `string`&nbsp; | &nbsp;`string`&nbsp; | &nbsp;[`Schema`](Schema)

### xrayEnabled

_Type_ : `boolean`

(experimental) A flag indicating whether or not X-Ray tracing is enabled for the GraphQL API.

- false


## AppSyncApiDynamoDbDataSourceProps


### cdk.dataSource.table

_Type_ : [`Table`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Table.html)



### description

_Type_ : `string`

### name

_Type_ : `string`

### table

_Type_ : [`Table`](Table)

### type

_Type_ : `"dynamodb"`

## AppSyncApiHttpDataSourceProps


### cdk.dataSource.authorizationConfig

_Type_ : [`AwsIamConfig`](AwsIamConfig)



### description

_Type_ : `string`

### endpoint

_Type_ : `string`

### name

_Type_ : `string`

### type

_Type_ : `"http"`

## AppSyncApiLambdaDataSourceProps
### description

_Type_ : `string`

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### name

_Type_ : `string`

### type

_Type_ : `"function"`

## AppSyncApiProps

### cdk.graphqlApi

_Type_ : [`IGraphqlApi`](IGraphqlApi)&nbsp; | &nbsp;[`AppSyncApiCdkGraphqlProps`](#appsyncapicdkgraphqlprops)






### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)





## AppSyncApiRdsDataSourceProps


### cdk.dataSource.databaseName

_Type_ : `string`

### cdk.dataSource.secretStore

_Type_ : [`ISecret`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ISecret.html)

### cdk.dataSource.serverlessCluster

_Type_ : [`IServerlessCluster`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IServerlessCluster.html)



### databaseName

_Type_ : `string`

### description

_Type_ : `string`

### name

_Type_ : `string`

### rds

_Type_ : [`RDS`](RDS)

### type

_Type_ : `"rds"`

## AppSyncApiResolverProps

### cdk.resolver

_Type_ : Omit<[`ResolverProps`](ResolverProps), `"api"`&nbsp; | &nbsp;`"fieldName"`&nbsp; | &nbsp;`"typeName"`&nbsp; | &nbsp;`"dataSource"`>


### dataSource

_Type_ : `string`

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### requestMapping

_Type_ : [`MappingTemplate`](MappingTemplate)

### responseMapping

_Type_ : [`MappingTemplate`](MappingTemplate)
