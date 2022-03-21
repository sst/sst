---
description: "Docs for the sst.WebSocketApi construct in the @serverless-stack/resources package"
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
new WebSocketApi(scope: Construct, id: string, props: WebSocketApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`WebSocketApiProps`](#websocketapiprops)
## Properties
An instance of `WebSocketApi` has the following properties.
### _connectionsArn

_Type_ : `string`


### cdk.accessLogGroup?

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

### cdk.certificate?

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)

### cdk.domainName?

_Type_ : [`DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)

### cdk.webSocketApi

_Type_ : [`WebSocketApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketApi.html)

### cdk.webSocketStage

_Type_ : [`WebSocketStage`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketStage.html)


### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### routes

_Type_ : `string`

### url

_Type_ : `string`

## Methods
An instance of `WebSocketApi` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ 

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- __routeKey__ `string`
- __permissions__ [`Permissions`](Permissions)
### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- __routeKey__ `string`
## WebSocketApiCdkStageProps


### autoDeploy?

_Type_ : `boolean`

_Default_ : `false`

(experimental) Whether updates to an API automatically trigger a new deployment.



### domainMapping?

_Type_ : [`DomainMappingOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainMappingOptions.html)

_Default_ : `- no custom domain and api mapping configuration`

(experimental) The options for custom domain and api mapping.



### stageName?

_Type_ : `string`

## WebSocketApiLambdaAuthorizer



### cdk.authorizer

_Type_ : [`WebSocketLambdaAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.WebSocketLambdaAuthorizer.html)


### function?

_Type_ : [`Function`](Function)

### identitySource?

_Type_ : `string`

### name?

_Type_ : `string`

### type

_Type_ : `"lambda"`

## WebSocketApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;[`WebSocketApiLambdaAuthorizer`](#websocketapilambdaauthorizer)


### cdk.webSocketApi?

_Type_ : [`IWebSocketApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IWebSocketApi.html)&nbsp; | &nbsp;[`WebSocketApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketApiProps.html)

### cdk.webSocketStage?

_Type_ : [`IWebSocketStage`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IWebSocketStage.html)&nbsp; | &nbsp;[`WebSocketApiCdkStageProps`](#websocketapicdkstageprops)


### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)


### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)




