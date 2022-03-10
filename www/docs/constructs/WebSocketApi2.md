---
description: "Docs for the sst.WebSocketApi construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new WebSocketApi(scope: Construct, id: string, props: WebSocketApiProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`WebSocketApiProps`](#websocketapiprops)
## Properties
An instance of `WebSocketApi` has the following properties.
### _connectionsArn

_Type_ : `string`

### _customDomainUrl

_Type_ : `string`

### accessLogGroup

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

### acmCertificate

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)

### apiGatewayDomain

_Type_ : [`DomainName`](DomainName)

### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### routes

_Type_ : unknown

### url

_Type_ : `string`

### webSocketApi

_Type_ : [`WebSocketApi`](WebSocketApi)

### webSocketStage

_Type_ : [`WebSocketStage`](WebSocketStage)

## Methods
An instance of `WebSocketApi` has the following methods.
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
## WebSocketApiCdkStageProps
### autoDeploy

_Type_ : `boolean`

(experimental) Whether updates to an API automatically trigger a new deployment.
false


### domainMapping

_Type_ : [`DomainMappingOptions`](DomainMappingOptions)

(experimental) The options for custom domain and api mapping.
- no custom domain and api mapping configuration


### stageName

_Type_ : `string`

## WebSocketApiProps
### accessLog

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### authorizationType

_Type_ : [`WebSocketApiAuthorizationType`](#websocketapiauthorizationtype)

### authorizer

_Type_ : [`WebSocketLambdaAuthorizer`](WebSocketLambdaAuthorizer)

### customDomain

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### routes

_Type_ : unknown

### webSocketApi

_Type_ : [`IWebSocketApi`](IWebSocketApi)&nbsp; | &nbsp;[`WebSocketApiProps`](WebSocketApiProps)

### webSocketStage

_Type_ : [`IWebSocketStage`](IWebSocketStage)&nbsp; | &nbsp;[`WebSocketApiCdkStageProps`](#websocketapicdkstageprops)
