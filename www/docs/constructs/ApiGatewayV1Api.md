---
description: "Docs for the sst.ApiGatewayV1Api construct in the @serverless-stack/resources package"
---

The `ApiGatewayV1Api` construct is a higher level CDK construct that makes it easy to create an API Gateway REST API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Initializer

```ts
new ApiGatewayV1Api(scope: Construct, id: string, props: ApiGatewayV1ApiProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`ApiGatewayV1ApiProps`](#apigatewayv1apiprops)

## Examples

The `ApiGatewayV1Api` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
new ApiGatewayV1Api(this, "Api", {
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

### Adding routes

Add routes after the API has been created.

```js
const api = new ApiGatewayV1Api(this, "Api", {
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
const api = new ApiGatewayV1Api(this, "Api");

api.addRoutes(this, {
  "GET    /notes": "src/list.main",
  "POST   /notes": "src/create.main",
});
```

### Adding catch-all route

Add routes after the API has been created.

```js
const api = new ApiGatewayV1Api(this, "Api", {
  routes: {
    "GET /notes": "src/list.main",
    "ANY /{proxy+}": "src/catch.main",
  },
});
```

### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-5}
new ApiGatewayV1Api(this, "Api", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
  },
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

### Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`ApiGatewayV1ApiRouteProps`](#apigatewayv1apirouteprops).

```js
new ApiGatewayV1Api(this, "Api", {
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

Note that, you can set the `defaultFunctionProps` while using the `function` per route. The `function` will just override the `defaultFunctionProps`. Except for the `environment` property, which will be merged.

```js
new ApiGatewayV1Api(this, "Api", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "list.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
      },
    },
    "POST /notes": "create.main",
  },
});
```

So in the above example, the `GET /notes` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set.

### Configuring Regional endpoint

Configure the internally created CDK `RestApi` instance.

```js {2-4}
new ApiGatewayV1Api(this, "Api", {
  restApi: {
    endpointConfiguration: {
      types: [apigateway.EndpointType.REGIONAL],
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Importing an existing Rest Api

Override the internally created CDK `RestApi` instance.

```js {2-9}
new ApiGatewayV1Api(this, "Api", {
  restApi: apigateway.fromRestApiAttributes(this, "MyRestApi", {
    restApiId,
    rootResourceId,
  }),
  importedPaths: {
    "/notes": "slx2bn",
    "/users": "uu8xs3",
  },
  routes: {
    "GET /notes/{noteId}": "src/getNote.main",
    "GET /users/{userId}": "src/getUser.main",
  },
});
```

### Configuring the access log format

Use a CSV format instead of default JSON format.

```js {2-3}
new ApiGatewayV1Api(this, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {2-4}
new ApiGatewayV1Api(this, "Api", {
  restApi: {
    defaultCorsPreflightOptions: {
      allowOrigins: ['"*"'],
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring custom domains

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Using the basic config

```js {2}
new ApiGatewayV1Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Using the full config

```js {2-7}
new ApiGatewayV1Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    endpointType: apigateway.EndpointType.EDGE,
    path: "v1",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Mapping multiple APIs to the same domain

```js {9-12}
const usersApi = new ApiGatewayV1Api(this, "UsersApi", {
  customDomain: {
    domainName: "api.domain.com",
    path: "users",
  },
});

new ApiGatewayV1Api(this, "PostsApi", {
  customDomain: {
    domainName: usersApi.apiGatewayDomain,
    path: "posts",
  },
});
```

#### Importing an existing API Gateway custom domain

```js {3-11}
new ApiGatewayV1Api(this, "Api", {
  customDomain: {
    domainName: apigateway.DomainName.fromDomainNameAttributes(
      this,
      "MyDomain",
      {
        domainName,
        domainNameAliasHostedZoneId,
        domainNameAliasTarget,
      }
    ),
    path: "newPath",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Importing an existing certificate

```js {4-8}
new ApiGatewayV1Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    certificate: certificatemanager.Certificate.fromCertificateArn(
      this,
      "MyCert",
      certArn
    ),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Attaching permissions

You can attach a set of permissions to all or some of the routes.

#### For the entire API

Allow the entire API to access S3.

```js {11}
const api = new ApiGatewayV1Api(this, "Api", {
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

#### For a specific route

Allow one of the routes to access S3.

```js {11}
const api = new ApiGatewayV1Api(this, "Api", {
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

### Adding auth

You can use IAM or JWT to add auth to your APIs.

#### Adding IAM authorization

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `IAM` and using the [`sst.Auth`](Auth.md) construct.

```js {2}
new ApiGatewayV1Api(this, "Api", {
  defaultAuthorizationType: apigateway.AuthorizationType.IAM,
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

#### Adding IAM authorization to a specific route

You can also secure specific routes in your APIs by setting the `authorizationType` to `AWS_IAM` and using the [`sst.Auth`](Auth.md) construct.

```js {6-8}
new ApiGatewayV1Api(this, "Api", {
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      function: "src/private.main",
      methodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM,
      },
    },
  },
});
```

#### Adding CUSTOM authorization

CUSTOM allows using a Lambda function to authorize users to access your API. Note that, this is a different authorization method when compared to using `AWS_IAM` and the [`sst.Auth`](Auth.md) construct, which allows you to secure other AWS resources as well.

```js {0-6,9-10}
const authorizer = new apigateway.RequestAuthorizer(this, "Authorizer", {
  handler: new Function(this, "AuthorizerFunction", {
    handler: "src/authorizer.main",
  }),
  identitySources: [apigateway.IdentitySource.header("Authorization")],
});

new ApiGatewayV1Api(this, "Api", {
  defaultAuthorizationType: apigateway.AuthorizationType.CUSTOM,
  defaultAuthorizer: authorizer,
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Adding CUSTOM authorization to a specific route

You can also secure specific routes using CUSTOM by setting the `authorizationType` per route.

```js {0-6,18-21}
const authorizer = new apigateway.RequestAuthorizer(this, "Authorizer", {
  handler: new Function(this, "AuthorizerFunction", {
    handler: "src/authorizer.main",
  }),
  identitySources: [apigateway.IdentitySource.header("Authorization")],
});

new ApiGatewayV1Api(this, "Api", {
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      function: {
        handler: "src/private.main",
        methodOptions: {
          authorizationType: apigateway.AuthorizationType.CUSTOM,
          defaultAuthorizer: authorizer,
        },
      },
    },
  },
});
```

#### Using Cognito User Pool as the authorizer

You can also use Cognito User Pools as an authorizer.

```js {0-3,6-8}
const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
  this,
  "Authorizer",
  {
    cognitoUserPools: [userPool],
  }
);

new ApiGatewayV1Api(this, "Api", {
  defaultAuthorizationType: apigateway.AuthorizationType.COGNITO,
  defaultAuthorizer: authorizer,
  defaultAuthorizationScopes: ["user.id", "user.email"],
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Getting the function for a route

```js {11}
const api = new ApiGatewayV1Api(this, "Api", {
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

## Properties

An instance of `ApiGatewayV1Api` contains the following properties.

### restApi

_Type_: [`cdk.aws-apigateway.RestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html)

The internally created CDK `RestApi` instance.

### accessLogGroup?

_Type_: [`cdk.aws-logs.LogGroup`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-logs.LogGroup.html)

If access logs are enabled, this is the internally created CDK `LogGroup` instance.

### apiGatewayDomain?

_Type_: [`cdk.aws-apigateway.DomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.DomainName.html)

If custom domain is enabled, this is the internally created CDK `DomainName` instance.

### acmCertificate?

_Type_: [`cdk.aws-certificatemanager.Certificate`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-certificatemanager.Certificate.html)

If custom domain is enabled, this is the internally created CDK `Certificate` instance.

## Methods

An instance of `ApiGatewayV1Api` contains the following methods.

### getFunction

```ts
getFunction(routeKey: string): Function
```

_Parameters_

- **routeKey** `string`

_Returns_

- [`Function`](Function.md)

Get the instance of the internally created [`Function`](Function.md), for a given route key. Where the `routeKey` is the key used to define a route. For example, `GET /notes`.

### addRoutes

```ts
addRoutes(scope: cdk.Construct, routes: { [key: string]: FunctionDefinition | ApiGatewayV1ApiRouteProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **routes** `{ [key: string]: FunctionDefinition | ApiGatewayV1ApiRouteProps }`

An associative array with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition) or the [`ApiGatewayV1ApiRouteProps`](#apigatewayv1apirouteprops).

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

## ApiGatewayV1ApiProps

### routes?

_Type_ : `{ [key: string]: FunctionDefinition | apigatewayv1apirouteprops }`, _defaults to_ `{}`

The routes for this API. Takes an associative array, with the key being the route as a string and the value is either a [`FunctionDefinition`](Function.md#functiondefinition).

```js
{
  "GET /notes": "src/list.main",
  "GET /notes/{id}": "src/get.main",
}
```

Or the [ApiGatewayV1ApiRouteProps](#apigatewayv1apirouteprops).

```js
{
  "GET /notes": {
    function: {
      handler: "src/list.main",
      environment: {
        TABLE_NAME: "notesTable",
      },
    },
    methodOptions: {
      authorizationType: apigateway.AuthorizationType.IAM,
    },
  },
}
```

### cors?

_Type_ : `boolean`, _defaults to_ `true`

CORS support for all the endpoints in the API. Takes a `boolean` value. To fully customizize the CORS configuration, pass in a [`restApi`](#restapi) with the [`defaultCorsPreflightOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html#defaultcorspreflightoptions) property.

By setting `cors` to `true`, SST also adds the CORS header to 4xx and 5xx gateway response.

### accessLog?

_Type_ : `boolean | string`, _defaults to_ `true`

CloudWatch access logs for the API. Takes a `boolean` value, or a `string` with log format. To fully customizize the access log configuration, pass in a [`restApi`](#restapi) with the [`deployOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApi.html#deployoptions) property.

### customDomain?

_Type_ : `string | ApiGatewayV1ApiCustomDomainProps`

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

### restApi?

_Type_ : `cdk.aws-apigateway.RestApiProps | cdk.aws-apigateway.IRestApi`

Pass in a [`cdk.aws-apigateway.RestApiProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.RestApiProps.html) value to override the default settings this construct uses to create the CDK `RestApi` internally.

Or, pass in an instance of the CDK [`cdk.aws-apigateway.IRestApi`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.IRestApi.html). SST will use the provided CDK `RestApi` instead of creating one internally.

### importedPaths?

_Type_ : `{ [path: string]: string }`

If you are importing an existing API Gateway REST API project, you can import existing route paths by providing a list of paths with their corresponding resource ids.

```js
{
  "/notes": "slx2bn",
  "/users": "uu8xs3",
}
```

API Gateway REST API is structured in a tree structure:

- Each path part is a separate API Gateway resource object.
- And a path part is a child resource of the preceding part.

So the part path /notes, is a child resource of the root resource /. And /notes/{noteId} is a child resource of /notes. If /notes has been created in the imported API, you have to import it before creating the /notes/{noteId} child route.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `function` is specified for a route, these default values are overridden. Except for the `environment` property, which will be merged.

### defaultAuthorizationType?

_Type_ : [`cdk.aws-apigateway.AuthorizationType](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.AuthorizationType.html)

The authorization type for all the endpoints in the API. Supports IAM, COGNITO, CUSTOM and NONE. Defaults to no authorization, `NONE`.

The IAM method together with the [`sst.Api`](Auth.md) construct uses the [Cognito Identity Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html). This allows you to secure other AWS resources as well.

On the other hand, the COGNITO and CUSTOM methods are for securing APIs specifically.

If you are just starting out, we recommend using the IAM method.

### defaultAuthorizer?

_Type_ : [`cdk.aws-apigateway.IAuthorizer](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.IAuthorizer.html)

The authorizer for all the routes in the API.

### defaultAuthorizationScopes?

_Type_ : `string[]`, _defaults to_ `[]`

An array of scopes to include in the authorization when using `JWT` as the `defaultAuthorizationType`. These will be merged with the scopes from the attached authorizer.

For example, `["user.id", "user.email"]`.

## ApiGatewayV1ApiRouteProps

### function

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for this route.

### methodOptions?

_Type_ : [`cdk.aws-apigateway.MethodOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.MethodOptions.html)

The options to be applied to the HTTP method for a route.

### integrationOptions?

_Type_ : [`cdk.aws-apigateway.LambdaIntegrationOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.LambdaIntegrationOptions.html)

The options to be applied to the Lambda integration for a route.

## ApiGatewayV1ApiCustomDomainProps

### domainName

_Type_ : `string | cdk.aws-apigateway.IDomainName`

The domain to be assigned to the API endpoint. Takes the custom domain as a `string` (ie. `api.domain.com`) or a [`cdk.aws-apigateway.IDomainName`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.IDomainName.html).

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

The base mapping for the custom domain. For example, by setting the `domainName` to `api.domain.com` and `path` to `v1`, the custom domain URL for the API will become `https://api.domain.com/v1`. If the `path` is not set, the custom domain URL will be `https://api.domain.com`.

:::caution
You cannot change the path once it has been set.
:::

Note, if the `path` was not defined initially, it cannot be defined later. If the `path` was initially defined, it cannot be later changed to _undefined_. Instead, you'd need to remove the `customDomain` option from the construct, deploy it. And then set it to the new path value.

### endpointType?

_Type_ : [`cdk.aws-apigateway.EndpointType`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.EndpointType.html), _defaults to `REGIONAL`_

The type of endpoint for this DomainName.

### mtls?

_Type_ : [`cdk.aws-apigateway.MTLSConfig`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.MTLSConfig.html), _defaults to mTLS not configured_

The mutual TLS authentication configuration for a custom domain name.

### securityPolicy?

_Type_ : [`cdk.aws-apigateway.SecurityPolicy`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-apigateway.SecurityPolicy.html), _defaults to `TLS_1_0`_

The Transport Layer Security (TLS) version + cipher suite for this domain name.
