---
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The Api construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains.

## Constructor
```ts
new Api(scope: Construct, id: string, props: ApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ApiProps`](#apiprops)

## Examples

The `Api` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```ts
import { Api } from "@serverless-stack/resources";

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

## Properties
An instance of `Api` has the following properties.
### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

If custom domain is enabled, this is the custom domain URL of the Api.
:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
:::

### httpApiArn

_Type_ : `string`

The ARN of the underlying HttpApi

### routes

_Type_ : Array< `string` >

The routes for the Api

### url

_Type_ : `string`

The AWS generated URL of the Api.


### cdk.accessLogGroup?

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

If access logs are enabled, this is the internally created CDK LogGroup instance.

### cdk.certificate?

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)

If custom domain is enabled, this is the internally created CDK Certificate instance.

### cdk.domainName?

_Type_ : [`DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)

If custom domain is enabled, this is the internally created CDK DomainName instance.

### cdk.httpApi

_Type_ : [`HttpApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApi.html)

The internally created CDK HttpApi instance.


## Methods
An instance of `Api` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: Record)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ Record<`string`, [`FunctionInlineDefinition`](Function)&nbsp; | &nbsp;[`ApiFunctionRouteProps`](#apifunctionrouteprops)&nbsp; | &nbsp;[`ApiHttpRouteProps`](#apihttprouteprops)&nbsp; | &nbsp;[`ApiAlbRouteProps`](#apialbrouteprops)>


Adds routes to the Api after it has been created.

#### Examples

```js
api.addRoutes(this, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
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
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
  },
});

api.attachPermissionsToRoute("GET /notes", ["s3"]);
```


### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- __routeKey__ `string`


Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `GET /notes`.

#### Examples

```js
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```

## ApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

Enable CloudWatch access logs for this API

#### Examples

```js
new Api(this, "Api", {
  accessLog: true
});
```

```js
new Api(this, "Api", {
  accessLog: {
    retention: "ONE_WEEK",
  },
});
```

### authorizers?

_Type_ : [`Authorizers`](Authorizers)

DOCTODO: This one is a bit weird because of the generic param but think examples will suffice

### cors?

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsProps`](CorsProps)

CORS support applied to all endpoints in this API

#### Examples


```js
new Api(this, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
});
```


### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)

#### Examples

```js
new Api(this, "Api", {
  customDomain: "api.example.com"
})
```


```js
new Api(this, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```


### defaults.authorizationScopes?

_Type_ : Array< `string` >

DOCTODO:

### defaults.authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

DOCTODO

### defaults.function?

_Type_ : [`FunctionProps`](Function)

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  }
});
```

### defaults.payloadFormatVersion?

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

_Default_ : `"2.0"
`

The [payload format version](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API.


### defaults.throttle.burst?

_Type_ : `number`

The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.

#### Examples

```js
new Api(this, "Api", {
  defaults: {
    throttle: {
      burst: 100
    }
  }
})
```

### defaults.throttle.rate?

_Type_ : `number`

The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.

#### Examples

```js
new Api(this, "Api", {
  defaults: {
    throttle: {
      rate: 10
    }
  }
})
```



### routes?

_Type_ : Record<`string`, [`FunctionInlineDefinition`](Function)&nbsp; | &nbsp;[`ApiFunctionRouteProps`](#apifunctionrouteprops)&nbsp; | &nbsp;[`ApiHttpRouteProps`](#apihttprouteprops)&nbsp; | &nbsp;[`ApiAlbRouteProps`](#apialbrouteprops)>

Define the routes for the API. Can be a function, proxy to another API, or point to an ALB

#### Examples


```js
{
  "GET /notes"      : "src/list.main",
  "GET /notes/{id}" : "src/get.main",
  "$default": "src/default.main"
}
```


### cdk.httpApi?

_Type_ : [`IHttpApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IHttpApi.html)&nbsp; | &nbsp;[`HttpApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApiProps.html)

Import the underlying HTTP API or override the default configuration

#### Examples

```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(this, "Api", {
  cdk: {
    httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
      httpApiId,
    }),
  }
});
```


```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api({
  httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
    httpApiId,
  }),
});
```

### cdk.httpStages?

_Type_ : Array< Omit<[`HttpStageProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpStageProps.html), `"httpApi"`> >

DOCTODO: What does this do + example


## ApiAlbRouteProps
Specify a route handler that forwards to an ALB

### Examples

DOCTODO: Need to complete example
```js
api.addRoutes(this, {
  "GET /notes/{id}": {
    type: "alb",
    url: "https://example.com/notes/{id}",
  }
});
```

### authorizationScopes?

_Type_ : Array< `string` >

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

### type

_Type_ : `"alb"`


### cdk.albListener

_Type_ : [`IApplicationListener`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IApplicationListener.html)

The listener to the application load balancer used for the integration.

### cdk.integration?

_Type_ : [`HttpAlbIntegrationProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpAlbIntegrationProps.html)


## ApiJwtAuthorizer


### identitySource?

_Type_ : Array< `string` >


### jwt.audience

_Type_ : Array< `string` >

### jwt.issuer

_Type_ : `string`


### name?

_Type_ : `string`

### type

_Type_ : `"jwt"`


### cdk.authorizer

_Type_ : [`HttpJwtAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpJwtAuthorizer.html)


## ApiHttpRouteProps
Specify a route handler that forwards to another URL

### Examples

```js
api.addRoutes(this, {
  "GET /notes/{id}": {
    type: "url",
    url: "https://example.com/notes/{id}",
  }
});
```

### authorizationScopes?

_Type_ : Array< `string` >

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

### type

_Type_ : `"url"`

This is a constant

### url

_Type_ : `string`

The URL to forward to


### cdk.integration

_Type_ : [`HttpUrlIntegrationProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpUrlIntegrationProps.html)

Override the underlying CDK integration


## ApiLambdaAuthorizer


### function?

_Type_ : [`Function`](Function)

### identitySource?

_Type_ : Array< `string` >

### name?

_Type_ : `string`

### responseTypes?

_Type_ : Array< `"SIMPLE"`&nbsp; | &nbsp;`"IAM"` >

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda"`


### cdk.authorizer

_Type_ : [`HttpLambdaAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpLambdaAuthorizer.html)


## ApiFunctionRouteProps
Specify a function route handler and configure additional options

### Examples

```js
api.addRoutes(this, {
  "GET /notes/{id}": {
    type: "function",
    function: "src/get.main",
    payloadFormatVersion: "1.0",
  }
});
```

### authorizationScopes?

_Type_ : Array< `string` >

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

### function

_Type_ : [`FunctionDefinition`](Function)

The function definition used to create the function for this route.

### payloadFormatVersion?

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

_Default_ : `"2.0"
`

The payload format version for the route.

### type?

_Type_ : `"function"`

## ApiUserPoolAuthorizer


### identitySource?

_Type_ : Array< `string` >

### name?

_Type_ : `string`

### type

_Type_ : `"user_pool"`


### userPool.clientIds?

_Type_ : Array< `string` >

### userPool.id

_Type_ : `string`

### userPool.region?

_Type_ : `string`



### cdk.authorizer

_Type_ : [`HttpUserPoolAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpUserPoolAuthorizer.html)

