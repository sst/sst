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
The `WebSocketApi` construct is a higher level CDK construct that makes it easy to create a WebSocket API. It provides a simple way to define your routes and allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Constructor
```ts
new WebSocketApi(scope: Construct, id: string, props: WebSocketApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`WebSocketApiProps`](#websocketapiprops)

## Examples

```js
import { WebSocketApi } from "@serverless-stack/resources";

new WebSocketApi(this, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});
```

## Properties
An instance of `WebSocketApi` has the following properties.
### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

Custom domain url if it's configured

### routes

_Type_ : Array< `string` >

List of routes of the websocket api

### url

_Type_ : `string`

Url of the websocket api


### cdk.accessLogGroup?

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

The internally created log group

### cdk.certificate?

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)

The internally created certificate

### cdk.domainName?

_Type_ : [`DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)

The internally created domain name

### cdk.webSocketApi

_Type_ : [`WebSocketApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketApi.html)

The internally created websocket api

### cdk.webSocketStage

_Type_ : [`WebSocketStage`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketStage.html)

The internally created websocket stage


## Methods
An instance of `WebSocketApi` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ 



Add routes to an already created WebSocket API

#### Examples

```js
api.addRoutes({
  "$connect": "src/connect.main",
})
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to all the routes. This allows the functions to access other AWS resources.

#### Examples


```js
api.attachPermissions(["s3"]);
```

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- __routeKey__ `string`
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to a specific route. This allows that function to access other AWS resources.

#### Examples

```js
api.attachPermissionsToRoute("$connect", ["s3"]);
```


### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- __routeKey__ `string`


Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `$connect`.

#### Examples

```js
const fn = api.getFunction("$connect");
```

## WebSocketApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

Enable CloudWatch access logs for this API

#### Examples

```js
new WebSocketApi(props.stack, "Api", {
  accessLog: true
});
```


```js
new WebSocketApi(props.stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
});
```

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;[`WebSocketApiLambdaAuthorizer`](#websocketapilambdaauthorizer)

### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)

#### Examples

```js
new WebSocketApi(props.stack, "Api", {
  customDomain: "api.example.com"
})
```


```js
new WebSocketApi(props.stack, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```


### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new WebSocketApi(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
});
```


### routes?

_Type_ : Record<`string`, [`FunctionDefinition`](FunctionDefinition)>

The routes for the Websocket API

#### Examples

```js
new WebSocketApi(props.stack, "Api", {
  routes: {
    $connect    : "src/connect.main",
    $default    : "src/default.main",
    $disconnect : "src/disconnect.main",
    sendMessage : "src/sendMessage.main",
  }
})
```


### cdk.webSocketApi?

_Type_ : [`IWebSocketApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IWebSocketApi.html)&nbsp; | &nbsp;[`WebSocketApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketApiProps.html)

Override the internally created WebSocket API

#### Examples

```js
new WebSocketApi(props.stack, "WebSocketApi", {
  cdk: {
    webSocketApi: {
      apiName: "my-websocket-api"
    }
  }
})
```

### cdk.webSocketStage?

_Type_ : [`IWebSocketStage`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IWebSocketStage.html)&nbsp; | &nbsp;[`WebSocketApiCdkStageProps`](#websocketapicdkstageprops)

Override the internally created WebSocket Stage

#### Examples

```js
new WebSocketApi(props.stack, "WebSocketApi", {
  cdk: {
    webSocketStage: {
      autoDeploy: false
    }
  }
})
```


## WebSocketApiCdkStageProps


### stageName?

_Type_ : `string`

## WebSocketApiLambdaAuthorizer


### function?

_Type_ : [`Function`](Function)

### identitySource?

_Type_ : Array< `string` >

### name?

_Type_ : `string`

### type

_Type_ : `"lambda"`


### cdk.authorizer

_Type_ : [`WebSocketLambdaAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.WebSocketLambdaAuthorizer.html)

