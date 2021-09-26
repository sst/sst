---
description: "Docs for the sst.WebSocketApi construct in the @serverless-stack/resources package"
---

The `WebSocketApi` construct is a higher level CDK construct that makes it easy to create a WebSocket API. It provides a simple way to define your routes and allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Initializer

```ts
new WebSocketApi(scope: Construct, id: string, props: WebSocketApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`WebSocketApiProps`](#websocketapiprops)

## Examples

The `WebSocketApi` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

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

### Adding routes

Add routes after the API has been created.

```js
const api = new WebSocketApi(this, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});

api.addRoutes(this, {
  sendMessage: "src/sendMessage.main",
});
```

### Lazily adding routes

Create an _empty_ Api construct and lazily add the routes.

```js {3-8}
const api = new WebSocketApi(this, "Api");

api.addRoutes(this, {
  $connect: "src/connect.main",
  $default: "src/default.main",
  $disconnect: "src/disconnect.main",
  sendMessage: "src/sendMessage.main",
});
```

### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-6}
new WebSocketApi(this, "Api", {
  defaultFunctionProps: {
    timeout: 20,
    permissions: [table],
    environment: { tableName: table.tableName },
  },
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});
```

### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`FunctionDefinition`](Function.md#functiondefinition).

```js
new WebSocketApi(this, "Api", {
  routes: {
    $default: {
      srcPath: "src/",
      handler: "default.main",
      permissions: [table],
      environment: { tableName: table.tableName },
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per route. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new WebSocketApi(this, "Api", {
  defaultFunctionProps: {
    timeout: 20,
    permissions: [table],
    environment: { tableName: table.tableName },
  },
  routes: {
    $default: {
      handler: "src/default.main",
      timeout: 10,
      permissions: [bucket],
      environment: { bucketName: bucket.bucketName },
    },
    $connect: "src/connect.main",
  },
});
```

So in the above example, the `$default` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

### Configuring the WebSocket Api

Configure the internally created CDK `WebSocketApi` instance.

```js {2-4}
new WebSocketApi(this, "Api", {
  webSocketApi: {
    apiName: "chat-app-api",
  },
  routes: {
    $default: "src/default.main",
  },
});
```

### Configuring the access log format

Use a CSV format instead of default JSON format.

```js {2-3}
new WebSocketApi(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    $default: "src/default.main",
  },
});
```

### Configuring custom domains

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Using the basic config

```js {2}
new WebSocketApi(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    $default: "src/default.main",
  },
});
```

#### Configuring with a wildcard

```js {2}
new WebSocketApi(this, "Api", {
  customDomain: "*.domain.com",
  routes: {
    $default: "src/default.main",
  },
});
```

#### Using the full config

```js {2-6}
new WebSocketApi(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    path: "v1",
  },
  routes: {
    $default: "src/default.main",
  },
});
```

#### Mapping multiple APIs to the same domain

```js {9-12}
const api = new HttpApi(this, "HttpApi", {
  customDomain: {
    domainName: "api.domain.com",
    path: "core",
  },
});

new WebSocketApi(this, "WebSocketApi", {
  customDomain: {
    domainName: api.apiGatewayDomain,
    path: "chat",
  },
});
```

#### Importing an existing API Gateway custom domain

```js {5-9}
import { DomainName } from "@aws-cdk/aws-apigatewayv2";

new WebSocketApi(this, "Api", {
  customDomain: {
    domainName: DomainName.fromDomainNameAttributes(this, "MyDomain", {
      name,
      regionalDomainName,
      regionalHostedZoneId,
    }),
    path: "newPath",
  },
  routes: {
    $default: "src/default.main",
  },
});
```

#### Importing an existing certificate

```js {6}
import { Certificate } from "@aws-cdk/aws-certificatemanager";

new WebSocketApi(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
  routes: {
    $default: "src/default.main",
  },
});
```

### Attaching permissions

You can attach a set of permissions to all or some of the routes.

:::note
By default all routes are granted the `execute-api:ManageConnections` permission to manage the WebSocket connections.
:::

For example, the route handler functions have the permissions make the `ApiGatewayManagementApi.postToConnection` call using the AWS SDK.

#### For the entire API

Allow the entire API to access S3.

```js {10}
const api = new WebSocketApi(this, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});

api.attachPermissions(["s3"]);
```

#### For a specific route

Allow one of the routes to access S3.

```js {10}
const api = new WebSocketApi(this, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});

api.attachPermissionsToRoute("$default", ["s3"]);
```

### Adding auth

You can use IAM, or a Lambda authorizer to add auth to your APIs.

#### Adding IAM authorization

You can secure your APIs (and other AWS resources) by setting the `authorizationType` to `IAM` and using the [`Auth`](Auth.md) construct.

```js {2}
new WebSocketApi(this, "Api", {
  authorizationType: WebSocketApiAuthorizationType.IAM,
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});
```

#### Adding Lambda authorization

You can also use a Lambda function to authorize users to access your API.

```js {4-10}
import { HttpLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new WebSocketApi(this, "Api", {
  authorizationType: WebSocketApiAuthorizationType.CUSTOM,
  authorizer: new HttpLambdaAuthorizer({
    authorizerName: "LambdaAuthorizer",
    handler: new sst.Function(this, "Authorizer", {
      handler: "src/authorizer.main",
    }),
  }),
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});
```

### Getting the function for a route

```js {11}
const api = new WebSocketApi(this, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});

const function = api.getFunction("sendMessage");
```

## Properties

An instance of `WebSocketApi` contains the following properties.

### url

_Type_: `string`

The URL of the WebSocket Api.

### routes

_Type_: `string[]`

The routes for the WebSocket Api.

### webSocketApi

_Type_: [`cdk.aws-apigatewayv2.WebSocketApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.WebSocketApi.html)

The internally created CDK `WebSocketApi` instance.

### webSocketStage

_Type_: [`cdk.aws-apigatewayv2.WebSocketStage`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.WebSocketStage.html)

The internally created CDK `WebSocketStage` instance.

### accessLogGroup?

_Type_: [`cdk.aws-logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)

If access logs are enabled, this is the internally created CDK `LogGroup` instance.

### customDomainUrl?

_Type_: `string`

If custom domain is enabled, this is the custom domain URL of the WebSocket Api.

### apiGatewayDomain?

_Type_: [`cdk.aws-apigatewayv2.DomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.DomainName.html)

If custom domain is enabled, this is the internally created CDK `DomainName` instance.

### acmCertificate?

_Type_: [`cdk.aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.Certificate.html)

If custom domain is enabled, this is the internally created CDK `Certificate` instance.

## Methods

An instance of `WebSocketApi` contains the following methods.

### getFunction

```ts
getFunction(routeKey: string): Function
```

_Parameters_

- **routeKey** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `$connect`.

### addRoutes

```ts
addRoutes(scope: cdk.Construct, routes: { [key: string]: FunctionDefinition })
```

_Parameters_

- **scope** `cdk.Construct`
- **routes** `{ [key: string]: FunctionDefinition }`

An associative array with the key being the route as a string and the value is the [`FunctionDefinition`](Function.md#functiondefinition).

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md)

:::note
By default all routes are granted the `execute-api:ManageConnections` permission to manage the WebSocket connections.
:::

Attaches the given list of [permissions](../util/Permissions.md) to all the routes. This allows the functions to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```

_Parameters_

- **routeKey** `string`

- **permissions** [`Permissions`](../util/Permissions.md)

:::note
By default all routes are granted the `execute-api:ManageConnections` permission to manage the WebSocket connections.
:::

Attaches the given list of [permissions](../util/Permissions.md) to a specific route. This allows that function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## WebSocketApiProps

### routes?

_Type_ : `{ [key: string]: FunctionDefinition }`, _defaults to_ `{}`

The routes for this API. Takes an associative array, with the key being the route as a string and the value is a [`FunctionDefinition`](Function.md#functiondefinition).

```js
{
  $connect    : "src/connect.main",
  $default    : "src/default.main",
  $disconnect : "src/disconnect.main",
  sendMessage : "src/sendMessage.main",
}
```

And here is an example with the full definition.

```js
{
  $connect: {
    handler: "src/connect.main",
    environment: {
      TABLE_NAME: "notesTable",
    },
  },
}
```

### accessLog?

_Type_ : `boolean | string | cdk.aws-apigatewayv2.CfnApiGatewayManagedOverrides.AccessLogSettingsProperty`, _defaults to_ `true`

CloudWatch access logs for the API. Takes a `boolean` value, a `string` with log format, or a [`cdk.aws-apigatewayv2.CfnApiGatewayManagedOverrides.AccessLogSettingsProperty`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.CfnApiGatewayManagedOverrides.AccessLogSettingsProperty.html).

### customDomain?

_Type_ : `string | WebSocketApiCustomDomainProps`

The customDomain for this API. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

Takes either the domain as a string.

```
"api.domain.com"
```

Or the [WebSocketApiCustomDomainProps](#websocketapicustomdomainprops).

```js
{
  domainName: "api.domain.com",
  hostedZone: "domain.com",
  path: "v1",
}
```

### webSocketApi?

_Type_ : `cdk.aws-apigatewayv2.WebSocketApiProps | cdk.aws-apigatewayv2.IWebSocketApi`

Pass in a [`cdk.aws-apigatewayv2.WebSocketApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.WebSocketApiProps.html) value to override the default settings this construct uses to create the CDK `WebSocketApi` internally.

Or, pass in an instance of the CDK [`cdk.aws-apigatewayv2.IWebSocketApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.IWebSocketApi.html). SST will use the provided CDK `IWebSocketApi` instead of creating one internally.

### webSocketStage?

_Type_ : `WebSocketApiCdkStageProps | cdk.aws-apigatewayv2.IWebSocketStage`

Pass in a [`WebSocketApiCdkStageProps`](#websocketapicdkstageprops) value to override the default settings this construct uses to create the CDK `WebSocketStage` internally.

Or, pass in an instance of the CDK [`cdk.aws-apigatewayv2.IWebSocketStage`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.IWebSocketStage.html). SST will use the provided CDK `IWebSocketStage` instead of creating one internally.

### authorizationType?

_Type_ : `WebSocketApiAuthorizationType`, _defaults to_ `WebSocketApiAuthorizationType.NONE`

The authorization type for the `$connect` route of the API. Set using [`WebSocketApiAuthorizationType`](#websocketapiauthorizationtype). Currently, it only supports IAM. Defaults to no authorization, `WebSocketApiAuthorizationType.NONE`.

The IAM method together with the [`Auth`](Auth.md) construct uses the [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). This allows you to secure other AWS resources as well.

### authorizer?

_Type_ : [`cdk.aws-apigatewayv2-authorizers.HttpLambdaAuthorizer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2-authorizers.HttpLambdaAuthorizer.html)

The authorizer for the `$connect` route of the API.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `function` is specified for a route, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

## WebSocketApiCustomDomainProps

### domainName

_Type_ : `string | cdk.aws-apigatewayv2.DomainName`

The domain to be assigned to the API endpoint. Takes the custom domain as a `string` (ie. `api.domain.com`) or a [`cdk.aws-apigatewayv2.DomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.DomainName.html).

Currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/).

### hostedZone?

_Type_ : `string | cdk.aws-route53.HostedZone`, _defaults to the base domain_

The hosted zone in Route 53 that contains the domain. Takes the name of the hosted zone as a `string` or the hosted zone construct [`cdk.aws-route53.HostedZone`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-route53.HostedZone.html). By default, SST will look for a hosted zone by stripping out the first part of the `domainName` that's passed in. So, if your `domainName` is `api.domain.com`. SST will default the `hostedZone` to `domain.com`.

Set this option if SST cannot find the hosted zone in Route 53.

### certificate?

_Type_ : [`cdk.aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.Certificate.html), _defaults to `undefined`_

The certificate for the domain. By default, SST will create a certificate with the domain name from the `domainName` option.

Set this option if you have an existing certificate in AWS Certificate Manager you want to use.

### path?

_Type_ : `string`, _defaults to_ `undefined`

The base mapping for the custom domain. For example, by setting the `domainName` to `api.domain.com` and `path` to `v1`, the custom domain URL for the WebSocket API will become `wss://api.domain.com/v1`. If the `path` is not set, the custom domain URL will be `wss://api.domain.com`.

:::caution
You cannot change the path once it has been set.
:::

Note, if the `path` was not defined initially, it cannot be defined later. If the `path` was initially defined, it cannot be later changed to _undefined_. Instead, you'd need to remove the `customDomain` option from the construct, deploy it. And then set it to the new path value.

## WebSocketApiCdkStageProps

`WebSocketApiCdkStageProps` extends [`cdk.aws-apigatewayv2.WebSocketStageProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.WebSocketStageProps.html) with the exception that the `webSocketApi` field is **not accepted** and the `stageName` field is **optional**. The `stageName` defaults to the stage of the app.

You can use `WebSocketApiCdkStageProps` to configure the other stage properties.

## WebSocketApiAuthorizationType

An enum with the following members representing the authorization types.

| Member | Description                                                                                         |
| ------ | --------------------------------------------------------------------------------------------------- |
| CUSTOM | Using a custom Lambda function as an authorizer.                                                    |
| IAM    | Used along with the [`Auth`](Auth.md) construct to add Cognito Identity Pool and IAM authorization. |
| NONE   | No authorization type is set.                                                                       |

For example, to use IAM, set `WebSocketApiAuthorizationType.IAM`.
