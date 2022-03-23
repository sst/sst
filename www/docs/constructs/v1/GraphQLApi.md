---
description: "Docs for the sst.GraphQLApi construct in the @serverless-stack/resources package"
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
new GraphQLApi(scope: Construct, id: string, props: GraphQLApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`GraphQLApiProps`](#graphqlapiprops)
## Properties
An instance of `GraphQLApi` has the following properties.
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

### serverFunction

_Type_ : [`Function`](Function)

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
An instance of `GraphQLApi` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: Record)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ Record<`string`, [`ApiRouteProps`](ApiRouteProps)>


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


### getConstructMetadata

```ts
getConstructMetadata(undefined)
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

## GraphQLApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

Enable CloudWatch access logs for this API

#### Examples

```js
new GraphQLApi(this, "Api", {
  accessLog: true
});
```

```js
new GraphQLApi(this, "Api", {
  accessLog: {
    retention: "ONE_WEEK",
  },
});
```

### authorizers?

_Type_ : `undefined`

DOCTODO: This one is a bit weird because of the generic param but think examples will suffice

### codegen?

_Type_ : `string`

Path to graphql-codegen configuration file

#### Examples

```js
new GraphQLApi(props.stack, "api", {
  codegen: "./graphql/codegen.yml"
})
```

### cors?

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsProps`](CorsProps)

CORS support applied to all endpoints in this API

#### Examples


```js
new GraphQLApi(this, "Api", {
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
new GraphQLApi(this, "Api", {
  customDomain: "api.example.com"
})
```


```js
new GraphQLApi(this, "Api", {
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
new GraphQLApi(this, "Api", {
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
new GraphQLApi(this, "Api", {
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
new GraphQLApi(this, "Api", {
  defaults: {
    throttle: {
      rate: 10
    }
  }
})
```



### rootPath?

_Type_ : `string`

### server

_Type_ : [`FunctionDefinition`](Function)

Path to function that will be invoked to resolve GraphQL queries.

#### Examples

```js
new GraphQLApi(props.stack, "api", {
  codegen: "./graphql/codegen.yml"
})
```


### cdk.httpApi?

_Type_ : [`IHttpApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IHttpApi.html)&nbsp; | &nbsp;[`HttpApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApiProps.html)

Import the underlying HTTP API or override the default configuration

#### Examples

```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new GraphQLApi(this, "Api", {
  cdk: {
    httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
      httpApiId,
    }),
  }
});
```


```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new GraphQLApi({
  httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
    httpApiId,
  }),
});
```

### cdk.httpStages?

_Type_ : Array< Omit<[`HttpStageProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpStageProps.html), `"httpApi"`> >

DOCTODO: What does this do + example

