---
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---
The `Api` construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

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

```js
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


### Adding routes

Add routes after the API has been created.

```js
const api = new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
  },
});

api.addRoutes(this, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

### Lazily adding routes

Create an _empty_ Api construct and lazily add the routes.

```js {3-6}
const api = new Api(this, "Api");

api.addRoutes(this, {
  "GET    /notes": "src/list.main",
  "POST   /notes": "src/create.main",
});
```


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


### Configuring underlying HTTP Api properties

```js {4-6}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(this, "Api", {
  httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
    httpApiId,
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```


### Importing an existing Http Api
```js {4-6}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(this, "Api", {
  httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
    httpApiId,
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```


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


### Working with routes

#### Using `ANY` methods

You can use the `ANY` method to match all methods that you haven't defined.

```js {4}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "ANY    /notes": "src/any.main",
  },
});
```

#### Using path variable

```js {4}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "GET    /notes/{id}": "src/get.main",
  },
});
```

#### Using greedy path variable

A path variable `{proxy+}` catches all child routes. The greedy path variable must be at the end of the resource path.

```js {4}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "GET    /notes/{proxy+}": "src/greedy.main",
  },
});
```

#### Using catch-all route

To add a catch-all route, add a route called `$default`. This will catch requests that don't match any other routes.

```js {5}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "$default"     : "src/default.main",
  },
});
```


### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`ApiFunctionRouteProps`](#apifunctionrouteprops).

```js
new Api(this, "Api", {
  routes: {
    "GET /notes": {
      function: {
        srcPath: "src/",
        handler: "list.main",
        environment: { tableName: table.tableName },
        permissions: [table],
      },
    },
  },
});
```

Note that, you can set the `defaults.function` while using the `function` per route. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "list.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
    },
    "POST /notes": "create.main",
  },
});
```

So in the above example, the `GET /notes` function doesn't use the `timeout` that is set in the `defaults.function`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.


### Configuring ALB routes
You can configure a route to integrate with Application Load Balancers in your VPC.

```js {3}
new Api(this, "Api", {
  routes: {
    "GET /": { albListener },
  },
});
```


### Configuring HTTP proxy routes
You can configure a route to pass the entire request to a publicly routable HTTP endpoint.

```js {3-5}
new Api(this, "Api", {
  routes: {
    "GET /": {
      url: "http://domain.com",
    },
  },
});
```

## Properties
An instance of `Api` has the following properties.

### cdk.accessLogGroup

_Type_ : [`LogGroup`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LogGroup.html)

If access logs are enabled, this is the internally created CDK LogGroup instance.

### cdk.certificate

_Type_ : [`Certificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Certificate.html)

If custom domain is enabled, this is the internally created CDK Certificate instance.

### cdk.domainName

_Type_ : [`DomainName`](DomainName)

If custom domain is enabled, this is the internally created CDK DomainName instance.

### cdk.httpApi

_Type_ : [`HttpApi`](HttpApi)

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

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of [permissions](../util/Permissions.md) to all the routes. This allows the functions to access other AWS resources.
Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey: string, permissions: Permissions)
```
_Parameters_
- __routeKey__ `string`
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of [permissions](../util/Permissions.md) to a specific route. This allows that function to access other AWS resources.
Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### getFunction

```ts
getFunction(routeKey: string)
```
_Parameters_
- __routeKey__ `string`


Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.

## ApiAlbRouteProps
### authorizationScopes

_Type_ : `string`

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;unknown


### cdk.albListener

_Type_ : [`IApplicationListener`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IApplicationListener.html)

The listener to the application load balancer used for the integration.

### cdk.integration

_Type_ : [`HttpAlbIntegrationProps`](HttpAlbIntegrationProps)


### type

_Type_ : `"alb"`

## ApiBaseRouteProps
### authorizationScopes

_Type_ : `string`

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;unknown

## ApiFunctionRouteProps
### authorizationScopes

_Type_ : `string`

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;unknown

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function definition used to create the function for this route.

### payloadFormatVersion

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for a specific route. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion).

### type

_Type_ : `"function"`

## ApiHttpRouteProps
### authorizationScopes

_Type_ : `string`

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;unknown


### cdk.integration

_Type_ : [`HttpUrlIntegrationProps`](HttpUrlIntegrationProps)


### type

_Type_ : `"url"`

### url

_Type_ : `string`

The HTTP URL for the HTTP proxy.

## ApiJwtAuthorizer

### cdk.authorizer

_Type_ : [`HttpJwtAuthorizer`](HttpJwtAuthorizer)


### identitySource

_Type_ : `string`


### jwt.audience

_Type_ : `string`

### jwt.issuer

_Type_ : `string`


### name

_Type_ : `string`

### type

_Type_ : `"jwt"`

## ApiLambdaAuthorizer

### cdk.authorizer

_Type_ : [`HttpLambdaAuthorizer`](HttpLambdaAuthorizer)


### function

_Type_ : [`Function`](Function)

### identitySource

_Type_ : `string`

### name

_Type_ : `string`

### responseTypes

_Type_ : `"SIMPLE"`&nbsp; | &nbsp;`"IAM"`

### resultsCacheTtl

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`

### type

_Type_ : `"lambda"`

## ApiProps
### accessLog

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

CloudWatch access logs for the API. Takes a `boolean` value, a `string` with log format, or a [`ApiAccessLogProps`](#apiaccesslogprops).

### authorizers

_Type_ : [`Authorizers`](Authorizers)


### cdk.httpApi

_Type_ : [`IHttpApi`](IHttpApi)&nbsp; | &nbsp;[`HttpApiProps`](HttpApiProps)

Configure underlying HTTP Api

### cdk.httpStages

_Type_ : Omit<[`HttpStageProps`](HttpStageProps), `"httpApi"`>


Configure CDK related properties

### cors

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsProps`](CorsProps)

CORS support for all the endpoints in the API. Takes a `boolean` value or a [`cdk.aws-apigatewayv2-alpha.CorsPreflightOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.CorsPreflightOptions.html).

### customDomain

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


### defaults.authorizationScopes

_Type_ : `string`

An array of scopes to include in the authorization for a specific route. Defaults to [`defaultAuthorizationScopes`](#defaultauthorizationscopes). If both `defaultAuthorizationScopes` and `authorizationScopes` are configured, `authorizationScopes` is used. Instead of the union of both.

### defaults.authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;unknown

### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the API. If the function is specified for a route, these default values are overridden. Except for the environment, the layers, and the permissions properties, that will be merged.

### defaults.payloadFormatVersion

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

The [payload format versions](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API. Set using [`ApiPayloadFormatVersion`](#apipayloadformatversion). Supports 2.0 and 1.0. Defaults to 2.0, `ApiPayloadFormatVersion.V2`.


### defaults.throttle.burst

_Type_ : `number`

The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.

### defaults.throttle.rate

_Type_ : `number`

The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.


Default throttling rate limits for all methods in this API.


Configure various defaults to be applied accross all routes

### routes

_Type_ : Record<`string`, [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`ApiFunctionRouteProps`](#apifunctionrouteprops)&nbsp; | &nbsp;[`ApiHttpRouteProps`](#apihttprouteprops)&nbsp; | &nbsp;[`ApiAlbRouteProps`](#apialbrouteprops)>

The routes for this API. Takes an associative array, with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition).
```js
{
  "GET /notes"      : "src/list.main",
  "GET /notes/{id}" : "src/get.main",
}
```

Or the [ApiFunctionRouteProps](#apifunctionrouteprops).

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

You can create a `$default` route that acts as a catch-all for requests that don't match any other routes.

```js
{
  "GET /notes"      : "src/list.main",
  "GET /notes/{id}" : "src/get.main",
  "$default"        : "src/default.main",
}
```

## ApiUserPoolAuthorizer

### cdk.authorizer

_Type_ : [`HttpUserPoolAuthorizer`](HttpUserPoolAuthorizer)


### identitySource

_Type_ : `string`

### name

_Type_ : `string`

### type

_Type_ : `"user_pool"`


### userPool.clientIds

_Type_ : `string`

### userPool.id

_Type_ : `string`

### userPool.region

_Type_ : `string`

