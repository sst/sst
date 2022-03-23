---
description: "Docs for the sst.ApiGatewayV1Api construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `ApiGatewayV1Api` construct is a higher level CDK construct that makes it easy to create an API Gateway REST API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

:::note
If you are creating a new API, use the `Api` construct instead.
:::

The Api construct uses [API Gateway V2](https://aws.amazon.com/blogs/compute/announcing-http-apis-for-amazon-api-gateway/). It's both faster and cheaper. However, if you need features like Usage Plans and API keys, use the `ApiGatewayV1Api` construct instead. You can [check out a detailed comparison here](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html).


## Constructor
```ts
new ApiGatewayV1Api(scope: Construct, id: string, props: ApiGatewayV1ApiProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`ApiGatewayV1ApiProps`](#apigatewayv1apiprops)
## Properties
An instance of `ApiGatewayV1Api` has the following properties.
### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

If custom domain is enabled, this is the custom domain URL of the Api.
:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
:::

### routes

_Type_ : Array< `string` >

The routes for the Api

### url

_Type_ : `string`

The AWS generated URL of the Api.


### cdk.accessLogGroup?

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

The internally created log group

### cdk.certificate?

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)&nbsp; | &nbsp;[`DnsValidatedCertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DnsValidatedCertificate.html)

The internally created certificate

### cdk.domainName?

_Type_ : [`DomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DomainName.html)

The internally created domain name

### cdk.restApi

_Type_ : [`RestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RestApi.html)

The internally created rest API


## Methods
An instance of `ApiGatewayV1Api` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: Record)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __routes__ Record<`string`, [`ApiGatewayV1ApiRouteProps`](ApiGatewayV1ApiRouteProps)>


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
const api = new ApiGatewayV1Api(this, "Api", {
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
const api = new ApiGatewayV1Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```

## ApiGatewayV1ApiProps


### accessLog?

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

Enable CloudWatch access logs for this API

#### Examples

```js
new ApiGatewayV1Api(props.stack, "Api", {
  accessLog: true
});

```

```js
new ApiGatewayV1Api(props.stack, "Api", {
  accessLog: {
    retention: "ONE_WEEK",
  },
});
```

### authorizers?

_Type_ : [`Authorizers`](Authorizers)

DOCTODO: This one is a bit weird because of the generic param but think examples will suffice

### cors?

_Type_ : `boolean`

CORS support applied to all endpoints in this API

#### Examples


```js
new ApiGatewayV1Api(this, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
});
```


### customDomain?

_Type_ : `string`&nbsp; | &nbsp;[`ApiGatewayV1ApiCustomDomainProps`](#apigatewayv1apicustomdomainprops)

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)

#### Examples

```js
new ApiGatewayV1Api(props.stack, "Api", {
  customDomain: "api.example.com"
})
```


```js
new ApiGatewayV1Api(props.stack, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```


### defaults.authorizationScopes?

_Type_ : Array< `string` >

DOCTODO

### defaults.authorizer?

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`

DOCTODO

### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new ApiGatewayV1Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  }
});
```


### routes?

_Type_ : Record<`string`, [`ApiGatewayV1ApiRouteProps`](ApiGatewayV1ApiRouteProps)>

Define the routes for the API. Can be a function, proxy to another API, or point to an ALB

#### Examples


```js
new ApiGatewayV1Api(props.stack, "Api", {
  "GET /notes"      : "src/list.main",
  "GET /notes/{id}" : "src/get.main",
  "$default": "src/default.main"
})
```





DOCTODO

### cdk.restApi?

_Type_ : [`IRestApi`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRestApi.html)&nbsp; | &nbsp;[`RestApiProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RestApiProps.html)

Override the internally created rest api

#### Examples

```js

new ApiGatewayV1Api(this, "Api", {
  cdk: {
    restApi: {
    description: "My api"
  }
  }
});
```


## ApiGatewayV1ApiCustomDomainProps


### domainName?

_Type_ : `string`

### endpointType?

_Type_ : `"edge"`&nbsp; | &nbsp;`"regional"`&nbsp; | &nbsp;`"private"`

### hostedZone?

_Type_ : `string`


### mtls.bucket

_Type_ : [`Bucket`](Bucket)

### mtls.key

_Type_ : `string`

### mtls.version?

_Type_ : `string`


### path?

_Type_ : `string`

### securityPolicy?

_Type_ : `"TLS 1.0"`&nbsp; | &nbsp;`"TLS 1.2"`


### cdk.certificate?

_Type_ : [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ICertificate.html)

### cdk.domainName?

_Type_ : [`IDomainName`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IDomainName.html)

### cdk.hostedZone?

_Type_ : [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IHostedZone.html)


## ApiGatewayV1ApiFunctionRouteProps
Specify a function route handler and configure additional options

### Examples

```js
api.addRoutes(props.stack, {
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

_Type_ : [`FunctionDefinition`](FunctionDefinition)


### cdk.integration?

_Type_ : [`LambdaIntegrationOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaIntegrationOptions.html)

### cdk.method?

_Type_ : Omit<[`MethodOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.MethodOptions.html), `"authorizationScopes"`&nbsp; | &nbsp;`"authorizer"`&nbsp; | &nbsp;`"authorizationType"`>


## ApiGatewayV1ApiUserPoolsAuthorizer


### authorizerName?

_Type_ : `string`

### identitySource?

_Type_ : `string`

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"user_pools"`

### userPoolIds?

_Type_ : Array< `string` >


### cdk.authorizer

_Type_ : [`CognitoUserPoolsAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CognitoUserPoolsAuthorizer.html)


## ApiGatewayV1ApiLambdaTokenAuthorizer


### authorizerName?

_Type_ : `string`

### function?

_Type_ : [`Function`](Function)

### identitySource?

_Type_ : `string`

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda_token"`

### validationRegex?

_Type_ : `string`


### cdk.assumeRole?

_Type_ : [`IRole`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRole.html)

### cdk.authorizer?

_Type_ : [`TokenAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TokenAuthorizer.html)


## ApiGatewayV1ApiLambdaRequestAuthorizer


### authorizerName?

_Type_ : `string`

### function?

_Type_ : [`Function`](Function)

### identitySources?

_Type_ : Array< `string` >

### resultsCacheTtl?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda_request"`


### cdk.assumeRole?

_Type_ : [`IRole`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IRole.html)

### cdk.authorizer?

_Type_ : [`TokenAuthorizer`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TokenAuthorizer.html)

