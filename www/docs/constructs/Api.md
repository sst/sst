---
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---

The `Api` construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

Unlike the lower level [`Function`](Function.md) construct, the `Api` construct doesn't directly extend a CDK construct, it wraps around a couple of them.

## Initializer

```ts
new Api(scope: Construct, id: string, props: ApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ApiProps`](#apiprops)

## Examples

The `Api` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});
```

Note that, the route key can have extra spaces in between, they are just ignored.

### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js
new Api(this, "Api", {
  defaultFunctionProps: {
    srcPath: "src/",
    environment: { tableName: table.tableName },
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

### Using the full config

Finally, if you wanted to configure each Lambda function separately, you can pass in the [`ApiRouteProps`](#apirouteprops).

```js
new Api(this, "Api", {
  routes: {
    "GET /notes": {
      function: {
        srcPath: "src/",
        handler: "list.main",
        environment: { tableName: table.tableName },
      },
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per route. The `function` will just override the `defaultFunctionProps`.

```js
new Api(this, "Api", {
  defaultFunctionProps: {
    srcPath: "src/",
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "list.main",
        srcPath: "services/functions/",
      },
    },
    "POST /notes": "create.main",
  },
});
```

So in the above example, the `GET /notes` function doesn't use the `srcPath` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`services/functions/`).

### Configuring a custom domain

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

```js {2}
new Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring a wildcard custom domain

```js {2}
new Api(this, "Api", {
  customDomain: "*.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring custom domain with all the options

```js {2-6}
new Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    path: "v1",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Getting the function for a route

```js {11}
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```

### Giving the entire API some permissions

Allow the entire API to access S3.

```js {11}
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

api.attachPermissions(["s3"]);
```

### Giving a specific route some permissions

Allow one of the routes to access S3.

```js {11}
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

api.attachPermissionsToRoute("GET /notes", ["s3"]);
```

### Adding IAM authorization

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `AWS_IAM` and using the [`sst.Auth`](Auth.md) construct.

```js {2}
new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

### Adding IAM authorization to a specific route

You can also secure specific routes in your APIs by setting the `authorizationType` to `AWS_IAM` and using the [`sst.Auth`](Auth.md) construct.

```js {5}
new Api(this, "Api", {
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizationType: ApiAuthorizationType.AWS_IAM,
      function: "src/private.main",
    },
  },
});
```

### Adding JWT authorization

[JWT](https://jwt.io/introduction) allows authorized users to access your API. Note that, this is a different authorization method when compared to using `AWS_IAM` and the [`sst.Auth`](Auth.md) construct, which allows you to secure other AWS resources as well.

```js {4-8}
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Adding JWT authorization to a specific route

You can also secure specific routes using JWT by setting the `authorizationType` per route.

```js {13}
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      function: {
        handler: "src/private.main",
        authorizationType: ApiAuthorizationType.JWT,
      },
    },
  },
});
```

Note that, setting a specific authorizer per route is not currently supported. It must be set for all the applicable routes as the `defaultAuthorizer`.

### Using Cognito User Pool as the JWT authorizer

JWT can also use a Cognito User Pool as an authorizer.

```js {4-9}
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpUserPoolAuthorizer({
    userPool,
    userPoolClient,
  }),
  defaultAuthorizationScopes: ["user.id", "user.email"],
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

## Properties

An instance of `Api` contains the following properties.

### httpApi

_Type_: [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html)

The internally created CDK `HttpApi` instance.

### accessLogGroup?

_Type_: [`cdk.aws-logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)

If access logs are enabled, this is the internally created CDK `LogGroup` instance.

## Methods

An instance of `Api` contains the following methods.

### getFunction

```ts
getFunction(routeKey: string): Function
```

_Parameters_

- **routeKey** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the routes. This allows the functions to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```

_Parameters_

- **routeKey** `string`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific route. This allows that function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## ApiProps

### routes

_Type_ : `{ [key: string]: FunctionDefinition | ApiRouteProps }`

The routes for this API. Takes an associative array, with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition).

```js
{
  "GET /notes": "src/list.main",
  "GET /notes/{id}": "src/get.main",
}
```

Or the [ApiRouteProps](#apirouteprops).

```js
{
  "GET /notes": {
    authorizationType: ApiAuthorizationType.AWS_IAM,
    function: {
      handler: "src/list.main",
      environment: {
        TABLE_NAME: "notesTable",
      },
    }
  },
}
```

### cors?

_Type_ : `boolean`, _defaults to_ `true`

CORS support for all the endpoints in the API.

### accessLog?

_Type_ : `boolean`, _defaults to_ `true`

CloudWatch access logs for the API.

### customDomain?

_Type_ : `string | ApiCustomDomainProps`

The customDomain for this API. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

Takes either the domain as a string.

```
"api.domain.com"
```

Or the [ApiCustomDomainProps](#apicustomdomainprops).

```js
{
  domainName: "api.domain.com",
  hostedZone: "domain.com",
  path: "v1",
}
```

### httpApi?

_Type_ : [`cdk.aws-apigatewayv2.HttpApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2.HttpApi.html), _defaults to_ `undefined`

Optionally, pass in an instance of the CDK `HttpApi`. This will override the default settings this construct uses to create the CDK `HttpApi` internally.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `function` is specified for a route, these default values are overridden.

### defaultAuthorizationType?

_Type_ : `ApiAuthorizationType`, _defaults to_ `ApiAuthorizationType.NONE`

The authorization type for all the endpoints in the API. Set using [`ApiAuthorizationType`](#apiauthorizationtype). Supports AWS IAM and JWT. Defaults to no authorization, `ApiAuthorizationType.NONE`.

While both IAM and JWT allows you to secure your APIs. The IAM method together with the [`sst.Api`](Auth.md) construct uses the [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). This allows you to secure other AWS resources as well.

On the other hand, the [JWT](https://jwt.io/introduction) method is for securing APIs specifically.

If you are just starting out, we recommend using the IAM method.

### defaultAuthorizer?

_Type_ : `cdk.aws-apigatewayv2-authorizers.HttpJwtAuthorizer | cdk.aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer`

The JWT authorizer for all the routes in the API. Currently, supports [`cdk.aws-apigatewayv2-authorizers.HttpJwtAuthorizer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2-authorizers.HttpJwtAuthorizer.html) or [`cdk.aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigatewayv2-authorizers.HttpUserPoolAuthorizer.html).

### defaultAuthorizationScopes?

_Type_ : `string[]`, _defaults to_ `[]`

An array of scopes to include in the authorization when using `JWT` as the `defaultAuthorizationType`. These will be merged with the scopes from the attached authorizer.

For example, `["user.id", "user.email"]`.

### defaultPayloadFormatVersion?

_Type_ : `ApiPayloadFormatVersion`, _defaults to_ `ApiPayloadFormatVersion.V2`

The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion). Supports 2.0 and 1.0. Defaults to 2.0, `ApiPayloadFormatVersion.V2`.

## ApiRouteProps

### function?

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for this route.

### authorizationType?

_Type_ : `ApiAuthorizationType`, _defaults to_ `ApiAuthorizationType.NONE`

The authorization type for the specific route. Set using [`ApiAuthorizationType`](#apiauthorizationtype). Defaults to no authorization.

## ApiCustomDomainProps

### domainName

_Type_ : `string`

The domain to be assigned to the API endpoint. Currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/).

Takes the custom domain as a string. For example, `api.domain.com`.

### hostedZone?

_Type_ : `string`, _defaults to the base domain_

The name of the hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone by stripping out the first part of the `domainName` that's passed in. So, if your `domainName` is `api.domain.com`. SST will default the `hostedZone` to `domain.com`.

Set this option if SST cannot find the hosted zone in Route 53.

### path?

_Type_ : `string`, _defaults to_ `undefined`

The base mapping for the custom domain. For example, by setting the `domainName` to `api.domain.com` and `path` to `v1`, the custom domain URL for the API will become `https://api.domain.com/v1`. If the `path` is not set, the custom domain URL will be `https://api.domain.com`.

:::caution
You cannot change the path once it has been set.
:::

Note, if the `path` was not defined initially, it cannot be defined later. If the `path` was initially defined, it cannot be later changed to _undefined_. Instead, you'd need to remove the `customDomain` option from the construct, deploy it. And then set it to the new path value.

## ApiAuthorizationType

An enum with the following members representing the authorization types.

| Member  | Description                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------- |
| AWS_IAM | Used along with the [`sst.Auth`](Auth.md) construct to add Cognito Identity Pool and IAM authorization. |
| JWT     | Using [JWT](https://jwt.io/introduction) as an authorizer.                                              |
| NONE    | No authorization type is set.                                                                           |

For example, to use IAM, set `sst.ApiAuthorizationType.AWS_IAM`.

## ApiPayloadFormatVersion

An enum with the following members representing the payload format versions.

| Member | Description                                               |
| ------ | --------------------------------------------------------- |
| V2     | Version 2.0 of the payload is sent to the lambda handler. |
| V1     | Version 1.0 of the payload is sent to the lambda handler. |

For example, to use V2, set `sst.ApiPayloadFormatVersion.V2`.
