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


### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

If custom domain is enabled, this is the custom domain URL of the Api.
:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
:::

### httpApiArn

_Type_ : `string`

### routes

_Type_ : `string`

The routes for the Api

### url

_Type_ : `string`

The URL of the Api.

## Methods
An instance of `Api` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: Record)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ Record<`string`, [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`ApiFunctionRouteProps`](#apifunctionrouteprops)&nbsp; | &nbsp;[`ApiHttpRouteProps`](#apihttprouteprops)&nbsp; | &nbsp;[`ApiAlbRouteProps`](#apialbrouteprops)>


Adds routes to the Api after it has been created. Specify an object with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`ApiFunctionRouteProps`](#apifunctionrouteprops).

#### Examples

```js
// Example Two
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


Attaches the given list of [permissions](../util/Permissions.md) to all the routes. This allows the functions to access other AWS resources.
Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

#### Examples

### Permissions for all routes

Allow the entire API to access S3.

```js {10}
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

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- __routeKey__ `string`
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of [permissions](../util/Permissions.md) to a specific route. This allows that function to access other AWS resources.
Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

#### Examples

### Permissions for a specific route

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


### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- __routeKey__ `string`


Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.

#### Examples

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

## ApiAlbRouteProps


### authorizationScopes?

_Type_ : `string`

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`



hereIam


### cdk.albListener

_Type_ : [`IApplicationListener`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IApplicationListener.html)

The listener to the application load balancer used for the integration.

### cdk.integration?

_Type_ : [`HttpAlbIntegrationProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpAlbIntegrationProps.html)


### type

_Type_ : `"alb"`

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

_Type_ : `string`

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`



hereIam

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function definition used to create the function for this route.

### payloadFormatVersion?

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

_Default_ : `"2.0"
`

The payload format version for the route.

### type?

_Type_ : `"function"`

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

_Type_ : `string`

### authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`



hereIam


### cdk.integration

_Type_ : [`HttpUrlIntegrationProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpUrlIntegrationProps.html)

Override the underlying CDK integration


### type

_Type_ : `"url"`

This is a constant

### url

_Type_ : `string`

The URL to forward to

## ApiJwtAuthorizer



### cdk.authorizer

_Type_ : [`HttpJwtAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpJwtAuthorizer.html)


### identitySource?

_Type_ : `string`


### jwt.audience

_Type_ : `string`

### jwt.issuer

_Type_ : `string`


### name?

_Type_ : `string`

### type

_Type_ : `"jwt"`

## ApiLambdaAuthorizer



### cdk.authorizer

_Type_ : [`HttpLambdaAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpLambdaAuthorizer.html)


### function?

_Type_ : [`Function`](Function)

### identitySource?

_Type_ : `string`

### name?

_Type_ : `string`

### responseTypes?

_Type_ : `"SIMPLE"`&nbsp; | &nbsp;`"IAM"`

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda"`

## ApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

CloudWatch access logs for the API. Takes a `boolean` value, a `string` with log format, or a [`ApiAccessLogProps`](#apiaccesslogprops).

#### Examples

### Configuring access log

#### Configuring the log format

Use a CSV format instead of default JSON format.

```js {2-3}
new Api(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Configuring the log retention setting

```js {3}
new Api(this, "Api", {
  accessLog: {
    retention: "ONE_WEEK",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### authorizers?

_Type_ : [`Authorizers`](Authorizers)


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

_Type_ : Omit<[`HttpStageProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpStageProps.html), `"httpApi"`>

DOCTODO: What does this do + example


### cors?

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsProps`](CorsProps)

CORS support for all the endpoints in the API. Takes a `boolean` value or a [`cdk.aws-apigatewayv2-alpha.CorsPreflightOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.CorsPreflightOptions.html).

#### Examples

### Configuring CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {4-6}
import { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(this, "Api", {
  cors: {
    allowMethods: [CorsHttpMethod.GET],
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```


### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`CustomDomainProps`](CustomDomainProps)

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

Note that, SST automatically creates a Route 53 A record in the hosted zone to point the custom domain to the API Gateway domain.

#### Examples

### Configuring custom domains
You can configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).
#### Using the basic config

```js {2}
new Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Configuring with a wildcard

```js {2}
new Api(this, "Api", {
  customDomain: "*.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Using the full config

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

#### Mapping multiple APIs to the same domain

```js {9-12}
const usersApi = new Api(this, "UsersApi", {
  customDomain: {
    domainName: "api.domain.com",
    path: "users",
  },
});

new Api(this, "PostsApi", {
  customDomain: {
    domainName: usersApi.apiGatewayDomain,
    path: "posts",
  },
});
```

#### Importing an existing API Gateway custom domain

```js {5-9}
import { DomainName } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(this, "Api", {
  customDomain: {
    domainName: DomainName.fromDomainNameAttributes(this, "MyDomain", {
      name,
      regionalDomainName,
      regionalHostedZoneId,
    }),
    path: "newPath",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Importing an existing certificate

```js {6}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Specifying a hosted zone

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {6-9}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: HostedZone.fromHostedZoneAttributes(this, "MyZone", {
      hostedZoneId,
      zoneName,
    }),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Loading domain name from SSM parameter

If you have the domain name stored in AWS SSM Parameter Store, you can reference the value as the domain name:

```js {3,6-9}
import { StringParameter } from "aws-cdk-lib/aws-ssm";

const rootDomain = StringParameter.valueForStringParameter(this, `/myApp/domain`);

new Api(this, "Api", {
  customDomain: {
    domainName: `api.${rootDomain}`,
    hostedZone: rootDomain,
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

Note that, normally SST will look for a hosted zone by stripping out the first part of the `domainName`. But this is not possible when the `domainName` is a reference. Since its value will be resolved at deploy time. So you'll need to specify the `hostedZone` explicitly.

#### Using externally hosted domain

```js {4-8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new Api(this, "Api", {
  customDomain: {
    isExternalDomain: true,
    domainName: "api.domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).


### defaults.authorizationScopes?

_Type_ : `string`

An array of scopes to include in the authorization for a specific route. Defaults to [`defaultAuthorizationScopes`](#defaultauthorizationscopes). If both `defaultAuthorizationScopes` and `authorizationScopes` are configured, `authorizationScopes` is used. Instead of the union of both.

### defaults.authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the API. If the function is specified for a route, these default values are overridden. Except for the environment, the layers, and the permissions properties, that will be merged.

#### Examples

### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-6}
new Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

### defaults.payloadFormatVersion?

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion). Supports 2.0 and 1.0. Defaults to 2.0, `ApiPayloadFormatVersion.V2`.


### defaults.throttle.burst?

_Type_ : `number`

The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.

### defaults.throttle.rate?

_Type_ : `number`

The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.


Default throttling rate limits for all methods in this API.

#### Examples

### Configuring throttling


```js {3-4}
new Api(this, "Api", {
  throttle: {
    rate: 2000,
    burst: 100,
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```


Configure various defaults to be applied accross all routes

### routes?

_Type_ : Record<`string`, [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`ApiFunctionRouteProps`](#apifunctionrouteprops)&nbsp; | &nbsp;[`ApiHttpRouteProps`](#apihttprouteprops)&nbsp; | &nbsp;[`ApiAlbRouteProps`](#apialbrouteprops)>

Define the routes for the API. Can be a function, proxy to another API, or point to an ALB

#### Examples


```js
{
  "GET /notes"      : "src/list.main",
  "GET /notes/{id}" : "src/get.main",
  "$default": "src/default.main"
}
```

## ApiUserPoolAuthorizer



### cdk.authorizer

_Type_ : [`HttpUserPoolAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpUserPoolAuthorizer.html)


### identitySource?

_Type_ : `string`

### name?

_Type_ : `string`

### type

_Type_ : `"user_pool"`


### userPool.clientIds?

_Type_ : `string`

### userPool.id

_Type_ : `string`

### userPool.region?

_Type_ : `string`

