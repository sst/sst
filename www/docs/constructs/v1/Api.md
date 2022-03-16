---
description: "Docs for the sst.Api construct in the @serverless-stack/resources package"
---
The `Api` construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Constructor
```ts
new Api(scope: Construct, id: string, props: ApiProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`ApiProps`](#apiprops)
## Examples

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

## Properties
An instance of `Api` has the following properties.
### cdk

_Type_ : unknown

### customDomainUrl

_Type_ : `undefined`&nbsp; | &nbsp;`string`

### httpApiArn

_Type_ : `string`

### routes

_Type_ : unknown

### url

_Type_ : `string`

## Methods
An instance of `Api` has the following methods.
### addRoutes

```ts
addRoutes(scope: Construct, routes: Record)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- routes Record<`string`, [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`ApiFunctionRouteProps`](#apifunctionrouteprops)&nbsp; | &nbsp;[`ApiHttpRouteProps`](#apihttprouteprops)&nbsp; | &nbsp;[`ApiAlbRouteProps`](#apialbrouteprops)>


Your mom

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
## ApiAlbRouteProps
### authorizationScopes

_Type_ : unknown

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;[`AuthorizersKeys`](AuthorizersKeys)

### cdk

_Type_ : unknown

### type

_Type_ : `"alb"`

## ApiBaseAuthorizer
### identitySource

_Type_ : unknown

### name

_Type_ : `string`

## ApiBaseRouteProps
### authorizationScopes

_Type_ : unknown

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;[`AuthorizersKeys`](AuthorizersKeys)

## ApiFunctionRouteProps
### authorizationScopes

_Type_ : unknown

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;[`AuthorizersKeys`](AuthorizersKeys)

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

### payloadFormatVersion

_Type_ : `"1.0"`&nbsp; | &nbsp;`"2.0"`

### type

_Type_ : `"function"`

## ApiHttpRouteProps
### authorizationScopes

_Type_ : unknown

### authorizer

_Type_ : `"none"`&nbsp; | &nbsp;`"iam"`&nbsp; | &nbsp;[`AuthorizersKeys`](AuthorizersKeys)

### cdk

_Type_ : unknown

### type

_Type_ : `"url"`

### url

_Type_ : `string`

## ApiJwtAuthorizer
### cdk

_Type_ : unknown

### identitySource

_Type_ : unknown

### jwt

_Type_ : unknown

### name

_Type_ : `string`

### type

_Type_ : `"jwt"`

## ApiLambdaAuthorizer
### cdk

_Type_ : unknown

### function

_Type_ : [`Function`](Function)

### identitySource

_Type_ : unknown

### name

_Type_ : `string`

### responseTypes

_Type_ : unknown

### resultsCacheTtl

_Type_ : unknown&nbsp; | &nbsp;unknown&nbsp; | &nbsp;unknown&nbsp; | &nbsp;unknown&nbsp; | &nbsp;unknown&nbsp; | &nbsp;unknown&nbsp; | &nbsp;unknown&nbsp; | &nbsp;unknown

### type

_Type_ : `"lambda"`

## ApiProps
### accessLog

_Type_ : `string`&nbsp; | &nbsp;`boolean`&nbsp; | &nbsp;[`AccessLogProps`](AccessLogProps)

### authorizers

_Type_ : [`Authorizers`](Authorizers)

### cdk

_Type_ : unknown

### cors

_Type_ : `boolean`&nbsp; | &nbsp;[`CorsProps`](CorsProps)

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

### defaults

_Type_ : unknown

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
### cdk

_Type_ : unknown

### identitySource

_Type_ : unknown

### name

_Type_ : `string`

### type

_Type_ : `"user_pool"`

### userPool

_Type_ : unknown
