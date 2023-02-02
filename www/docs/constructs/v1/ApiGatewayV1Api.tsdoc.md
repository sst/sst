<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new ApiGatewayV1Api(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[ApiGatewayV1ApiProps](#apigatewayv1apiprops)</span>
## ApiGatewayV1ApiProps


### accessLog?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">boolean</span> | <span class="mono">[ApiGatewayV1ApiAccessLogProps](#apigatewayv1apiaccesslogprops)</span></span>

Enable CloudWatch access logs for this API


```js
new ApiGatewayV1Api(stack, "Api", {
  accessLog: true
});

```

```js
new ApiGatewayV1Api(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
});
```

### authorizers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">[ApiGatewayV1ApiUserPoolsAuthorizer](#apigatewayv1apiuserpoolsauthorizer)</span> | <span class="mono">[ApiGatewayV1ApiLambdaTokenAuthorizer](#apigatewayv1apilambdatokenauthorizer)</span> | <span class="mono">[ApiGatewayV1ApiLambdaRequestAuthorizer](#apigatewayv1apilambdarequestauthorizer)</span></span>&gt;</span>

Define the authorizers for the API. Can be a user pool, JWT, or Lambda authorizers.


```js
new ApiGatewayV1Api(stack, "Api", {
  authorizers: {
    MyAuthorizer: {
      type: "user_pools",
      userPoolIds: [userPool.userPoolId],
    },
  },
});
```

### cors?

_Type_ : <span class="mono">boolean</span>

CORS support applied to all endpoints in this API



```js
new ApiGatewayV1Api(stack, "Api", {
  cors: true,
});
```


### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[ApiGatewayV1ApiCustomDomainProps](#apigatewayv1apicustomdomainprops)</span></span>

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)


```js
new ApiGatewayV1Api(stack, "Api", {
  customDomain: "api.example.com"
})
```


```js
new ApiGatewayV1Api(stack, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```


### defaults.authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

_Default_ : <span class="mono">[]</span>

An array of scopes to include in the authorization when using `user_pool` or `jwt` authorizers. These will be merged with the scopes from the attached authorizer.

### defaults.authorizer?

_Type_ : <span class='mono'><span class="mono">"none"</span> | <span class="mono">"iam"</span> | <span class="mono">string</span></span>

The authorizer for all the routes in the API.


```js
new ApiGatewayV1Api(stack, "Api", {
  defaults: {
    authorizer: "iam",
  }
});
```


```js
new ApiGatewayV1Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pools",
      userPoolIds: [userPool.userPoolId],
    },
  },
  defaults: {
    authorizer: "Authorizer",
  }
});
```

### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new ApiGatewayV1Api(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  er
});
```


### routes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[ApiGatewayV1ApiFunctionRouteProps](#apigatewayv1apifunctionrouteprops)</span></span>&gt;</span>

Define the routes for the API. Can be a function, proxy to another API, or point to an ALB



```js
new ApiGatewayV1Api(stack, "Api", {
  "GET /notes"      : "src/list.main",
  "GET /notes/{id}" : "src/get.main",
  "$default": "src/default.main"
})
```


### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.




If you are importing an existing API Gateway REST API project, you can import existing route paths by providing a list of paths with their corresponding resource ids.


```js
import { RestApi } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(stack, "Api", {
  cdk: {
    restApi: RestApi.fromRestApiAttributes(stack, "ImportedApi", {
      restApiId,
      rootResourceId,
    }),
    importedPaths: {
      "/notes": "slx2bn",
      "/users": "uu8xs3",
    },
  }
});
```

API Gateway REST API is structured in a tree structure:
- Each path part is a separate API Gateway resource object.
- And a path part is a child resource of the preceding part.
So the part path /notes, is a child resource of the root resource /. And /notes/{noteId} is a child resource of /notes. If /notes has been created in the imported API, you have to import it before creating the /notes/{noteId} child route.

### cdk.restApi?

_Type_ : <span class='mono'><span class="mono">[IRestApi](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IRestApi.html)</span> | <span class="mono">[RestApiProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApiProps.html)</span></span>

Override the internally created rest api


```js

new ApiGatewayV1Api(stack, "Api", {
  cdk: {
    restApi: {
      description: "My api"
    }
  }
});
```


## Properties
An instance of `ApiGatewayV1Api` has the following properties.
### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

If custom domain is enabled, this is the custom domain URL of the Api.
:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
:::

### id

_Type_ : <span class="mono">string</span>

### restApiArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created API Gateway REST API

### restApiId

_Type_ : <span class="mono">string</span>

The id of the internally created API Gateway REST API

### routes

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The routes for the Api

### url

_Type_ : <span class="mono">string</span>

The AWS generated URL of the Api.


### cdk.accessLogGroup?

_Type_ : <span class="mono">[LogGroup](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)</span>

The internally created log group

### cdk.certificate?

_Type_ : <span class='mono'><span class="mono">[Certificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.Certificate.html)</span> | <span class="mono">[DnsValidatedCertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.DnsValidatedCertificate.html)</span></span>

The internally created certificate

### cdk.domainName?

_Type_ : <span class="mono">[DomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.DomainName.html)</span>

The internally created domain name

### cdk.restApi

_Type_ : <span class="mono">[RestApi](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.RestApi.html)</span>

The internally created rest API


## Methods
An instance of `ApiGatewayV1Api` has the following methods.
### addRoutes

```ts
addRoutes(scope, routes)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __routes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[ApiGatewayV1ApiFunctionRouteProps](#apigatewayv1apifunctionrouteprops)</span></span>&gt;</span>


Adds routes to the Api after it has been created.


```js
api.addRoutes(stack, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to all the routes. This allows the functions to access other AWS resources.



```js
api.attachPermissions(["s3"]);
```

### attachPermissionsToRoute

```ts
attachPermissionsToRoute(routeKey, permissions)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to a specific route. This allows that function to access other AWS resources.


```js
const api = new ApiGatewayV1Api(stack, "Api", {
  routes: {
    "GET /notes": "src/list.main",
  },
});

api.attachPermissionsToRoute("GET /notes", ["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all the routes.



```js
api.bind([STRIPE_KEY, bucket]);
```

### bindToRoute

```ts
bindToRoute(routeKey, constructs)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific route.


```js
const api = new Api(stack, "Api", {
  routes: {
    "GET /notes": "src/list.main",
  },
});

api.bindToRoute("GET /notes", [STRIPE_KEY, bucket]);
```


### getFunction

```ts
getFunction(routeKey)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `GET /notes`.


```js
const api = new ApiGatewayV1Api(stack, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```

## ApiGatewayV1ApiAccessLogProps


### destinationArn?

_Type_ : <span class="mono">string</span>

### format?

_Type_ : <span class="mono">string</span>

### retention?

_Type_ : <span class='mono'><span class="mono">"one_day"</span> | <span class="mono">"three_days"</span> | <span class="mono">"five_days"</span> | <span class="mono">"one_week"</span> | <span class="mono">"two_weeks"</span> | <span class="mono">"one_month"</span> | <span class="mono">"two_months"</span> | <span class="mono">"three_months"</span> | <span class="mono">"four_months"</span> | <span class="mono">"five_months"</span> | <span class="mono">"six_months"</span> | <span class="mono">"one_year"</span> | <span class="mono">"thirteen_months"</span> | <span class="mono">"eighteen_months"</span> | <span class="mono">"two_years"</span> | <span class="mono">"five_years"</span> | <span class="mono">"six_years"</span> | <span class="mono">"seven_years"</span> | <span class="mono">"eight_years"</span> | <span class="mono">"nine_years"</span> | <span class="mono">"ten_years"</span> | <span class="mono">"infinite"</span></span>

## ApiGatewayV1ApiCustomDomainProps
The customDomain for this API. SST currently supports domains that are configured using Route 53. If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).


```js
new ApiGatewayV1Api(stack, "Api", {
  customDomain: "api.domain.com",
});
```


```js
new ApiGatewayV1Api(stack, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    endpointType: EndpointType.EDGE,
    path: "v1",
  }
});
```

Note that, SST automatically creates a Route 53 A record in the hosted zone to point the custom domain to the API Gateway domain.

### domainName?

_Type_ : <span class="mono">string</span>

The domain to be assigned to the API endpoint.

### endpointType?

_Type_ : <span class='mono'><span class="mono">"edge"</span> | <span class="mono">"regional"</span> | <span class="mono">"private"</span></span>

_Default_ : <span class="mono">`regional`</span>

The type of endpoint for this DomainName.

### hostedZone?

_Type_ : <span class="mono">string</span>

The hosted zone in Route 53 that contains the domain.
By default, SST will look for a hosted zone by stripping out the first part of the domainName that's passed in. So, if your domainName is `api.domain.com`, SST will default the hostedZone to `domain.com`.


### mtls.bucket

_Type_ : <span class="mono">[Bucket](Bucket#bucket)</span>

The bucket that the trust store is hosted in.

### mtls.key

_Type_ : <span class="mono">string</span>

The key in S3 to look at for the trust store.

### mtls.version?

_Type_ : <span class="mono">string</span>

The version of the S3 object that contains your truststore.
To specify a version, you must have versioning enabled for the S3 bucket.


### path?

_Type_ : <span class="mono">string</span>

The base mapping for the custom domain. For example, by setting the `domainName` to `api.domain.com` and `path` to `v1`, the custom domain URL for the API will become `https://api.domain.com/v1`. If the path is not set, the custom domain URL will be `https://api.domain.com`.
:::caution
You cannot change the path once it has been set.
:::

Note, if the `path` was not defined initially, it cannot be defined later. If the `path` was initially defined, it cannot be later changed to _undefined_. Instead, you'd need to remove the `customDomain` option from the construct, deploy it. And then set it to the new path value.

### securityPolicy?

_Type_ : <span class='mono'><span class="mono">"TLS 1.0"</span> | <span class="mono">"TLS 1.2"</span></span>

_Default_ : <span class="mono">`TLS 1.0`</span>

The Transport Layer Security (TLS) version + cipher suite for this domain name.


### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Import the underlying ACM certificate.

### cdk.domainName?

_Type_ : <span class="mono">[IDomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.IDomainName.html)</span>

Import the underlying API Gateway custom domain names.

### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Import the underlying Route 53 hosted zone.


## ApiGatewayV1ApiFunctionRouteProps
Specify a function route handler and configure additional options


```js
api.addRoutes(props.stack, {
  "GET /notes/{id}": {
    type: "function",
    function: "src/get.main",
  }
});
```

### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class='mono'><span class="mono">"none"</span> | <span class="mono">"iam"</span> | <span class="mono">string</span></span>

### function?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>


### cdk.function?

_Type_ : <span class="mono">[IFunction](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.IFunction.html)</span>

Use an existing Lambda function.

### cdk.integration?

_Type_ : <span class="mono">[LambdaIntegrationOptions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.LambdaIntegrationOptions.html)</span>

### cdk.method?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[MethodOptions](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.MethodOptions.html)</span>, <span class='mono'><span class="mono">"authorizer"</span> | <span class="mono">"authorizationType"</span> | <span class="mono">"authorizationScopes"</span></span>&gt;</span>


## ApiGatewayV1ApiUserPoolsAuthorizer
Specify a user pools authorizer and configure additional options.


```js
new ApiGatewayV1Api(stack, "Api", {
  authorizers: {
    MyAuthorizer: {
      type: "user_pools",
      userPoolIds: [userPool.userPoolId],
    },
  },
});
```

### identitySource?

_Type_ : <span class="mono">string</span>

The identity source for which authorization is requested.

### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.

### resultsCacheTtl?

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">Not cached</span>

The amount of time the results are cached.

### type

_Type_ : <span class="mono">"user_pools"</span>

String literal to signify that the authorizer is user pool authorizer.

### userPoolIds?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The ids of the user pools to use for authorization.


### cdk.authorizer

_Type_ : <span class="mono">[CognitoUserPoolsAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.CognitoUserPoolsAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.


## ApiGatewayV1ApiLambdaTokenAuthorizer
Specify a Lambda TOKEN authorizer and configure additional options.


```js
new ApiGatewayV1Api(stack, "Api", {
  authorizers: {
    MyAuthorizer: {
      type: "lambda_token",
      function: new Function(stack, "Authorizer", {
        handler: "test/lambda.handler"
      }),
      identitySources: [apig.IdentitySource.header("Authorization")],
    },
  },
});
```

### function?

_Type_ : <span class="mono">[Function](Function#function)</span>

Used to create the authorizer function

### identitySource?

_Type_ : <span class="mono">string</span>

The identity source for which authorization is requested.

### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.

### resultsCacheTtl?

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">Not cached</span>

The amount of time the results are cached.

### type

_Type_ : <span class="mono">"lambda_token"</span>

String literal to signify that the authorizer is Lambda TOKEN authorizer.

### validationRegex?

_Type_ : <span class="mono">string</span>

An regex to be matched against the authorization token.
Note that when matched, the authorizer lambda is invoked, otherwise a 401 Unauthorized is returned to the client.


### cdk.assumeRole?

_Type_ : <span class="mono">[IRole](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IRole.html)</span>

An IAM role for API Gateway to assume before calling the Lambda-based authorizer.

### cdk.authorizer?

_Type_ : <span class="mono">[TokenAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.TokenAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.


## ApiGatewayV1ApiLambdaRequestAuthorizer
Specify a Lambda REQUEST authorizer and configure additional options.


```js
new ApiGatewayV1Api(stack, "Api", {
  authorizers: {
    MyAuthorizer: {
      type: "lambda_request",
      function: new Function(stack, "Authorizer", {
        handler: "test/lambda.handler"
      }),
      identitySources: [apig.IdentitySource.header("Authorization")],
    },
  },
});
```

### function?

_Type_ : <span class="mono">[Function](Function#function)</span>

Used to create the authorizer function

### identitySources?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The identity sources for which authorization is requested.

### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.

### resultsCacheTtl?

_Type_ : <span class='mono'><span class="mono">${number} second</span> | <span class="mono">${number} seconds</span> | <span class="mono">${number} minute</span> | <span class="mono">${number} minutes</span> | <span class="mono">${number} hour</span> | <span class="mono">${number} hours</span> | <span class="mono">${number} day</span> | <span class="mono">${number} days</span></span>

_Default_ : <span class="mono">Not cached</span>

The amount of time the results are cached.

### type

_Type_ : <span class="mono">"lambda_request"</span>

String literal to signify that the authorizer is Lambda REQUEST authorizer.


### cdk.assumeRole?

_Type_ : <span class="mono">[IRole](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IRole.html)</span>

An IAM role for API Gateway to assume before calling the Lambda-based authorizer.

### cdk.authorizer?

_Type_ : <span class="mono">[TokenAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.TokenAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.

