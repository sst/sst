---
description: "Docs for the sst.GraphQLApi construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new GraphQLApi(scope: Construct, id: string, props: GraphQLApiProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`GraphQLApiProps`](#graphqlapiprops)
## Properties
An instance of `GraphQLApi` has the following properties.
### accessLogGroup

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

### acmCertificate

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)

### apiGatewayDomain

_Type_ : [`DomainName`](DomainName)

### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### httpApi

_Type_ : [`HttpApi`](HttpApi)

### httpApiArn

_Type_ : `string`

### routes

_Type_ : unknown

### serverFunction

_Type_ : [`Function`](Function)

### url

_Type_ : `string`

## Methods
An instance of `GraphQLApi` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- routes unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- routeKey `string`
- permissions [`Permissions`](Permissions)
### getConstructMetadata

```ts
getConstructMetadata(undefined)
```
### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- routeKey `string`
## GraphQLApiProps
### accessLog

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### codegen

_Type_ : `string`

Path to graphql-codegen configuration file
### cors

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsPreflightOptions`](CorsPreflightOptions)

### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)

### defaultAuthorizationScopes

_Type_ : unknown

### defaultAuthorizationType

_Type_ : [`ApiAuthorizationType`](ApiAuthorizationType)

### defaultAuthorizer

_Type_ : [`HttpJwtAuthorizer`](HttpJwtAuthorizer)&nbsp; | &nbsp;[`HttpLambdaAuthorizer`](HttpLambdaAuthorizer)&nbsp; | &nbsp;[`HttpUserPoolAuthorizer`](HttpUserPoolAuthorizer)

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### defaultPayloadFormatVersion

_Type_ : [`ApiPayloadFormatVersion`](ApiPayloadFormatVersion)

### defaultThrottlingBurstLimit

_Type_ : `number`

### defaultThrottlingRateLimit

_Type_ : `number`

### httpApi

_Type_ : [`IHttpApi`](IHttpApi)&nbsp; | &nbsp;[`HttpApiProps`](HttpApiProps)

### rootPath

_Type_ : `string`

### server

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### stages

_Type_ : unknown
