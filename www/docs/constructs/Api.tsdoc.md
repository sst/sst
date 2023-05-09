<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Api(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[ApiProps](#apiprops)</span>
## ApiProps
### accessLog?

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class="mono">boolean</span><span class='mono'> | </span><span class="mono">[ApiAccessLogProps](#apiaccesslogprops)</span>

Enable CloudWatch access logs for this API
```js
new Api(stack, "Api", {
  accessLog: true
});
```



```js
new Api(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
});
```
### authorizers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[ApiUserPoolAuthorizer](#apiuserpoolauthorizer)</span><span class='mono'> | </span><span class="mono">[ApiJwtAuthorizer](#apijwtauthorizer)</span><span class='mono'> | </span><span class="mono">[ApiLambdaAuthorizer](#apilambdaauthorizer)</span>&gt;</span>

Define the authorizers for the API. Can be a user pool, JWT, or Lambda authorizers.
```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      },
    },
  },
});
```
### cors?

_Type_ : <span class="mono">boolean</span><span class='mono'> | </span><span class="mono">[ApiCorsProps](#apicorsprops)</span>

CORS support applied to all endpoints in this API
```js
new Api(stack, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
});
```
### customDomain?

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class="mono">[ApiDomainProps](#apidomainprops)</span>

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)
```js
new Api(stack, "Api", {
  customDomain: "api.example.com"
})
```



```js
new Api(stack, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```

### defaults.authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

An array of scopes to include in the authorization when using 
`user_pool`
 or 
`jwt`
 authorizers. These will be merged with the scopes from the attached authorizer.
### defaults.authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

The default authorizer for all the routes in the API.
```js
new Api(stack, "Api", {
  defaults: {
    authorizer: "iam",
  }
});
```
```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      },
    },
  },
  defaults: {
    authorizer: "Authorizer",
  }
});
```
### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the API. The 
`environment`
, 
`permissions`
 and 
`layers`
 properties will be merged with per route definitions if they are defined.
```js
new Api(stack, "Api", {
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

_Type_ : <span class="mono">"1.0"</span><span class='mono'> | </span><span class="mono">"2.0"</span>

The [payload format version](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API.

### defaults.throttle.burst?

_Type_ : <span class="mono">number</span>

The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.
```js
new Api(stack, "Api", {
  defaults: {
    throttle: {
      burst: 100
    }
  }
})
```
### defaults.throttle.rate?

_Type_ : <span class="mono">number</span>

The [steady-state rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.
```js
new Api(stack, "Api", {
  defaults: {
    throttle: {
      rate: 10
    }
  }
})
```


### routes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[ApiFunctionRouteProps](#apifunctionrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiAwsRouteProps](#apiawsrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiHttpRouteProps](#apihttprouteprops)</span><span class='mono'> | </span><span class="mono">[ApiAlbRouteProps](#apialbrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiNlbRouteProps](#apinlbrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiGraphQLRouteProps](#apigraphqlrouteprops)</span>&gt;</span>

Define the routes for the API. Can be a function, proxy to another API, or point to an load balancer
```js
new Api(stack, "api", {
  routes: {
    "GET /notes"      : "src/list.main",
    "GET /notes/{id}" : "src/get.main",
    "$default": "src/default.main"
  }
})
```

### cdk.httpApi?

_Type_ : <span class="mono">[IHttpApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IHttpApi.html)</span><span class='mono'> | </span><span class="mono">[HttpApiProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApiProps.html)</span>

Import the underlying HTTP API or override the default configuration
```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
  cdk: {
    httpApi: HttpApi.fromHttpApiAttributes(stack, "MyHttpApi", {
      httpApiId,
    }),
  }
});
```
### cdk.httpStages?

_Type_ : <span class='mono'>Array&lt;<span class="mono">Omit&lt;<span class="mono">[HttpStageProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpStageProps.html)</span>, <span class="mono">"httpApi"</span>&gt;</span>&gt;</span>

Configures the stages to create for the HTTP API.

Note that, a default stage is automatically created, unless the 
`cdk.httpApi.createDefaultStage`
 is set to `false.
```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
  cdk: {
    httpStages: [{
      stageName: "dev",
      autoDeploy: false,
    }],
  }
});
```
### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

## Properties
An instance of `Api` has the following properties.
### customDomainUrl

_Type_ : <span class="mono">undefined</span><span class='mono'> | </span><span class="mono">string</span>

If custom domain is enabled, this is the custom domain URL of the Api.

:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [
`domainName`
](#domainname) is set to 
`api.domain.com`
 and the [
`path`
](#path) is 
`v1`
, the custom domain URL of the API will be 
`https://api.domain.com/v1/`
.
:::
### httpApiArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created API Gateway HTTP API
### httpApiId

_Type_ : <span class="mono">string</span>

The id of the internally created API Gateway HTTP API
### id

_Type_ : <span class="mono">string</span>

### routes

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The routes for the Api
### url

_Type_ : <span class="mono">string</span>

The AWS generated URL of the Api.

### cdk.accessLogGroup?

_Type_ : <span class="mono">[LogGroup](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)</span>

If access logs are enabled, this is the internally created CDK LogGroup instance.
### cdk.certificate?

_Type_ : <span class="mono">[Certificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.Certificate.html)</span>

If custom domain is enabled, this is the internally created CDK Certificate instance.
### cdk.domainName?

_Type_ : <span class="mono">[DomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)</span>

If custom domain is enabled, this is the internally created CDK DomainName instance.
### cdk.httpApi

_Type_ : <span class="mono">[HttpApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApi.html)</span>

The internally created CDK HttpApi instance.

## Methods
An instance of `Api` has the following methods.
### addRoutes

```ts
addRoutes(scope, routes)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __routes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[ApiFunctionRouteProps](#apifunctionrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiAwsRouteProps](#apiawsrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiHttpRouteProps](#apihttprouteprops)</span><span class='mono'> | </span><span class="mono">[ApiAlbRouteProps](#apialbrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiNlbRouteProps](#apinlbrouteprops)</span><span class='mono'> | </span><span class="mono">[ApiGraphQLRouteProps](#apigraphqlrouteprops)</span>&gt;</span>


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
const api = new Api(stack, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
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


Get the instance of the internally created Function, for a given route key where the 
`routeKey`
 is the key used to define a route. For example, 
`GET /notes`
.
```js
const api = new Api(stack, "Api", {
  routes: {
    "GET /notes": "src/list.main",
  },
});

const listFunction = api.getFunction("GET /notes");
```
### setCors

```ts
setCors(cors)
```
_Parameters_
- __cors__ <span class="mono">boolean</span><span class='mono'> | </span><span class="mono">[ApiCorsProps](#apicorsprops)</span>


Binds the given list of resources to a specific route.
```js
const api = new Api(stack, "Api");

api.setCors({
  allowMethods: ["GET"],
});
```
## ApiCorsProps
### allowCredentials?

_Type_ : <span class="mono">boolean</span>

Specifies whether credentials are included in the CORS request.
### allowHeaders?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The collection of allowed headers.
```js
// Allow all headers
allowHeaders: ["*"]

// Allow specific headers
allowHeaders: ["Accept", "Content-Type", "Authorization"]
```
### allowMethods?

_Type_ : <span class='mono'>Array&lt;<span class="mono">"GET"</span><span class='mono'> | </span><span class="mono">"PUT"</span><span class='mono'> | </span><span class="mono">"HEAD"</span><span class='mono'> | </span><span class="mono">"POST"</span><span class='mono'> | </span><span class="mono">"DELETE"</span><span class='mono'> | </span><span class="mono">"ANY"</span><span class='mono'> | </span><span class="mono">"PATCH"</span><span class='mono'> | </span><span class="mono">"OPTIONS"</span>&gt;</span>

The collection of allowed HTTP methods.
```js
// Allow all methods
allowMethods: ["ANY"]

// Allow specific methods
allowMethods: ["GET", "POST"]
```
### allowOrigins?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The collection of allowed origins.
```js
// Allow all origins
allowOrigins: ["*"]

// Allow specific origins. Note that the url protocol, ie. "https://", is required.
allowOrigins: ["https://domain.com"]
```
### exposeHeaders?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The collection of exposed headers.
### maxAge?

_Type_ : <span class="mono">${number} second</span><span class='mono'> | </span><span class="mono">${number} seconds</span><span class='mono'> | </span><span class="mono">${number} minute</span><span class='mono'> | </span><span class="mono">${number} minutes</span><span class='mono'> | </span><span class="mono">${number} hour</span><span class='mono'> | </span><span class="mono">${number} hours</span><span class='mono'> | </span><span class="mono">${number} day</span><span class='mono'> | </span><span class="mono">${number} days</span>

Specify how long the results of a preflight response can be cached
```js
maxAge: "1 day"
```
## ApiDomainProps
### domainName?

_Type_ : <span class="mono">string</span>

The domain to be assigned to the API endpoint (ie. api.domain.com)
### hostedZone?

_Type_ : <span class="mono">string</span>

The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone by stripping out the first part of the domainName that's passed in. So, if your domainName is api.domain.com. SST will default the hostedZone to domain.com.
### isExternalDomain?

_Type_ : <span class="mono">boolean</span>

Set this option if the domain is not hosted on Amazon Route 53.
### path?

_Type_ : <span class="mono">string</span>

The base mapping for the custom domain.

For example, by setting the domainName to api.domain.com and the path to v1, the custom domain URL of the API will become https://api.domain.com/v1/. If the path is not set, the custom domain URL will be https://api.domain.com. Note the additional trailing slash in the former case.

### cdk.certificate?

_Type_ : <span class="mono">[ICertificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html)</span>

Override the internally created certificate
### cdk.domainName?

_Type_ : <span class="mono">[IDomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IDomainName.html)</span>

Override the internally created domain name
### cdk.hostedZone?

_Type_ : <span class="mono">[IHostedZone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.IHostedZone.html)</span>

Override the internally created hosted zone

## ApiAlbRouteProps
Specify a route handler that forwards to an ALB
```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "alb",
    cdk: {
      albListener: listener,
    }
  }
});
```
### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

### type

_Type_ : <span class="mono">"alb"</span>


### cdk.albListener

_Type_ : <span class="mono">[IApplicationListener](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.IApplicationListener.html)</span>

The listener to the application load balancer used for the integration.
### cdk.integration?

_Type_ : <span class="mono">[HttpAlbIntegrationProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpAlbIntegrationProps.html)</span>


## ApiAwsRouteProps
Specify a function route handler and configure additional options
```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "aws",
    cdk: {
      integration: {
        subtype: apig.HttpIntegrationSubtype.EVENTBRIDGE_PUT_EVENTS,
        parameterMapping: ParameterMapping.fromObject({
          Source: MappingValue.custom("$request.body.source"),
          DetailType: MappingValue.custom("$request.body.detailType"),
          Detail: MappingValue.custom("$request.body.detail"),
        }),
      }
    }
  }
});
```
### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

### type

_Type_ : <span class="mono">"aws"</span>

This is a constant

### cdk.integration

_Type_ : <span class="mono">Omit&lt;<span class="mono">[CdkHttpAwsIntegrationProps](#cdkhttpawsintegrationprops)</span>, <span class="mono">"credentials"</span>&gt;</span>


## ApiJwtAuthorizer
Specify a JWT authorizer and configure additional options.
```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "jwt",
      userPool: {
        issuer: "https://abc.us.auth0.com",
        audience: ["123"],
      },
    },
  },
});
```
### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The identity source for which authorization is requested.

### jwt.audience

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

A list of the intended recipients of the JWT.
### jwt.issuer

_Type_ : <span class="mono">string</span>

The base domain of the identity provider that issues JWT.

### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.
### type

_Type_ : <span class="mono">"jwt"</span>

String literal to signify that the authorizer is JWT authorizer.

### cdk.authorizer

_Type_ : <span class="mono">[HttpJwtAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpJwtAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.

## ApiNlbRouteProps
Specify a route handler that forwards to an NLB
```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "nlb",
    cdk: {
      nlbListener: listener,
    }
  }
});
```
### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

### type

_Type_ : <span class="mono">"nlb"</span>


### cdk.integration?

_Type_ : <span class="mono">[HttpNlbIntegrationProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpNlbIntegrationProps.html)</span>

### cdk.nlbListener

_Type_ : <span class="mono">[INetworkListener](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.INetworkListener.html)</span>

The listener to the application load balancer used for the integration.

## ApiAccessLogProps
### destinationArn?

_Type_ : <span class="mono">string</span>

### format?

_Type_ : <span class="mono">string</span>

### retention?

_Type_ : <span class="mono">"one_day"</span><span class='mono'> | </span><span class="mono">"three_days"</span><span class='mono'> | </span><span class="mono">"five_days"</span><span class='mono'> | </span><span class="mono">"one_week"</span><span class='mono'> | </span><span class="mono">"two_weeks"</span><span class='mono'> | </span><span class="mono">"one_month"</span><span class='mono'> | </span><span class="mono">"two_months"</span><span class='mono'> | </span><span class="mono">"three_months"</span><span class='mono'> | </span><span class="mono">"four_months"</span><span class='mono'> | </span><span class="mono">"five_months"</span><span class='mono'> | </span><span class="mono">"six_months"</span><span class='mono'> | </span><span class="mono">"one_year"</span><span class='mono'> | </span><span class="mono">"thirteen_months"</span><span class='mono'> | </span><span class="mono">"eighteen_months"</span><span class='mono'> | </span><span class="mono">"two_years"</span><span class='mono'> | </span><span class="mono">"three_years"</span><span class='mono'> | </span><span class="mono">"five_years"</span><span class='mono'> | </span><span class="mono">"six_years"</span><span class='mono'> | </span><span class="mono">"seven_years"</span><span class='mono'> | </span><span class="mono">"eight_years"</span><span class='mono'> | </span><span class="mono">"nine_years"</span><span class='mono'> | </span><span class="mono">"ten_years"</span><span class='mono'> | </span><span class="mono">"infinite"</span>

## ApiHttpRouteProps
Specify a route handler that forwards to another URL
```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "url",
    url: "https://example.com/notes/{id}",
  }
});
```
### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

### type

_Type_ : <span class="mono">"url"</span>

This is a constant
### url

_Type_ : <span class="mono">string</span>

The URL to forward to

### cdk.integration

_Type_ : <span class="mono">[HttpUrlIntegrationProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-integrations-alpha.HttpUrlIntegrationProps.html)</span>

Override the underlying CDK integration

## ApiLambdaAuthorizer
Specify a Lambda authorizer and configure additional options.
```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "lambda",
      function: new Function(stack, "Authorizer", {
        handler: "test/lambda.handler",
      }),
    },
  },
});
```
### function?

_Type_ : <span class="mono">[Function](Function#function)</span>

Used to create the authorizer function
### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The identity source for which authorization is requested.
### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.
### responseTypes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">"simple"</span>&gt;</span>

The types of responses the lambda can return.

If 
`simple`
 is included then response format 2.0 will be used.
### resultsCacheTtl?

_Type_ : <span class="mono">${number} second</span><span class='mono'> | </span><span class="mono">${number} seconds</span><span class='mono'> | </span><span class="mono">${number} minute</span><span class='mono'> | </span><span class="mono">${number} minutes</span><span class='mono'> | </span><span class="mono">${number} hour</span><span class='mono'> | </span><span class="mono">${number} hours</span><span class='mono'> | </span><span class="mono">${number} day</span><span class='mono'> | </span><span class="mono">${number} days</span>

The amount of time the results are cached.
### type

_Type_ : <span class="mono">"lambda"</span>

String literal to signify that the authorizer is Lambda authorizer.

### cdk.authorizer

_Type_ : <span class="mono">[HttpLambdaAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpLambdaAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.

## ApiGraphQLRouteProps
Specify a route handler that handles GraphQL queries using Pothos
```js
api.addRoutes(stack, {
  "POST /graphql": {
     type: "graphql",
     function: {
       handler: "functions/graphql/graphql.ts",
     },
     pothos: {
       schema: "backend/functions/graphql/schema.ts",
       output: "graphql/schema.graphql",
       commands: [
         "./genql graphql/graphql.schema graphql/
       ]
     }
  }
})
```
### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

### function

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[FunctionProps](Function#functionprops)</span>

The function definition used to create the function for this route. Must be a graphql handler

### pothos.commands?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

Commands to run after generating schema. Useful for code generation steps
### pothos.internalPackages?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

List of packages that should be considered internal during schema generation
### pothos.output?

_Type_ : <span class="mono">string</span>

File to write graphql schema to
### pothos.schema?

_Type_ : <span class="mono">string</span>

Path to pothos schema

### type

_Type_ : <span class="mono">"graphql"</span>

## ApiFunctionRouteProps
Specify a function route handler and configure additional options
```js
api.addRoutes(stack, {
  "GET /notes/{id}": {
    type: "function",
    function: "src/get.main",
    payloadFormatVersion: "1.0",
  }
});
```
### authorizationScopes?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### authorizer?

_Type_ : <span class="mono">"none"</span><span class='mono'> | </span><span class="mono">"iam"</span><span class='mono'> | </span><span class="mono">string</span>

### function?

_Type_ : <span class="mono">string</span><span class='mono'> | </span><span class="mono">[Function](Function#function)</span><span class='mono'> | </span><span class="mono">[FunctionProps](Function#functionprops)</span>

The function definition used to create the function for this route.
### payloadFormatVersion?

_Type_ : <span class="mono">"1.0"</span><span class='mono'> | </span><span class="mono">"2.0"</span>

The payload format version for the route.
### type?

_Type_ : <span class="mono">"function"</span>


### cdk.function?

_Type_ : <span class="mono">[IFunction](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.IFunction.html)</span>

Use an existing Lambda function.

## ApiUserPoolAuthorizer
Specify a user pool authorizer and configure additional options.
```js
new Api(stack, "Api", {
  authorizers: {
    Authorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      },
    },
  },
});
```
### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The identity source for which authorization is requested.
### name?

_Type_ : <span class="mono">string</span>

The name of the authorizer.
### type

_Type_ : <span class="mono">"user_pool"</span>

String li any shot and having even a miniscule shotteral to signify that the authorizer is user pool authorizer.

### userPool.clientIds?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

The ids of the user pool clients to use for authorization.
### userPool.id

_Type_ : <span class="mono">string</span>

The id of the user pool to use for authorization.
### userPool.region?

_Type_ : <span class="mono">string</span>

The AWS region of the user pool.


### cdk.authorizer

_Type_ : <span class="mono">[HttpUserPoolAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.HttpUserPoolAuthorizer.html)</span>

This allows you to override the default settings this construct uses internally to create the authorizer.

## CdkHttpAwsIntegrationProps
### credentials

_Type_ : <span class="mono">[IntegrationCredentials](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IntegrationCredentials.html)</span>

The credentials with which to invoke the integration.
### parameterMapping

_Type_ : <span class="mono">[ParameterMapping](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.ParameterMapping.html)</span>

Specifies how to transform HTTP requests before sending them to the backend
### subtype

_Type_ : <span class="mono">[HttpIntegrationSubtype](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpIntegrationSubtype.html)</span>

Specifies the AWS service action to invoke