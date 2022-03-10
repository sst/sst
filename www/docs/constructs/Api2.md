---
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Api(scope: Construct, id: string, props: ApiProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`ApiProps`](#apiprops)
## Properties
An instance of `Api` has the following properties.
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

### url

_Type_ : `string`

## Methods
An instance of `Api` has the following methods.
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
### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- routeKey `string`
## ApiAlbRouteProps
### albListener

_Type_ : [`IApplicationListener`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IApplicationListener.html)

### authorizationScopes

_Type_ : unknown

### authorizationType

_Type_ : [`ApiAuthorizationType`](#apiauthorizationtype)

### authorizer

_Type_ : [`HttpJwtAuthorizer`](HttpJwtAuthorizer)&nbsp; | &nbsp;[`HttpLambdaAuthorizer`](HttpLambdaAuthorizer)&nbsp; | &nbsp;[`HttpUserPoolAuthorizer`](HttpUserPoolAuthorizer)

### method

_Type_ : `string`

### vpcLink

_Type_ : [`IVpcLink`](IVpcLink)

## ApiFunctionRouteProps
### authorizationScopes

_Type_ : unknown

### authorizationType

_Type_ : [`ApiAuthorizationType`](#apiauthorizationtype)

### authorizer

_Type_ : [`HttpJwtAuthorizer`](HttpJwtAuthorizer)&nbsp; | &nbsp;[`HttpLambdaAuthorizer`](HttpLambdaAuthorizer)&nbsp; | &nbsp;[`HttpUserPoolAuthorizer`](HttpUserPoolAuthorizer)

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### payloadFormatVersion

_Type_ : [`ApiPayloadFormatVersion`](#apipayloadformatversion)

## ApiHttpRouteProps
### authorizationScopes

_Type_ : unknown

### authorizationType

_Type_ : [`ApiAuthorizationType`](#apiauthorizationtype)

### authorizer

_Type_ : [`HttpJwtAuthorizer`](HttpJwtAuthorizer)&nbsp; | &nbsp;[`HttpLambdaAuthorizer`](HttpLambdaAuthorizer)&nbsp; | &nbsp;[`HttpUserPoolAuthorizer`](HttpUserPoolAuthorizer)

### method

_Type_ : `string`

### url

_Type_ : `string`

## ApiProps
### accessLog

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### cors

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsPreflightOptions`](CorsPreflightOptions)

### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)

### defaultAuthorizationScopes

_Type_ : unknown

### defaultAuthorizationType

_Type_ : [`ApiAuthorizationType`](#apiauthorizationtype)

### defaultAuthorizer

_Type_ : [`HttpJwtAuthorizer`](HttpJwtAuthorizer)&nbsp; | &nbsp;[`HttpLambdaAuthorizer`](HttpLambdaAuthorizer)&nbsp; | &nbsp;[`HttpUserPoolAuthorizer`](HttpUserPoolAuthorizer)

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### defaultPayloadFormatVersion

_Type_ : [`ApiPayloadFormatVersion`](#apipayloadformatversion)

### defaultThrottlingBurstLimit

_Type_ : `number`

### defaultThrottlingRateLimit

_Type_ : `number`

### httpApi

_Type_ : [`IHttpApi`](IHttpApi)&nbsp; | &nbsp;[`HttpApiProps`](HttpApiProps)

### routes

_Type_ : unknown

### stages

_Type_ : unknown
