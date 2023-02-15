<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new GraphQLApi(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[GraphQLApiProps](#graphqlapiprops)</span>
## GraphQLApiProps


### accessLog?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">boolean</span> | <span class="mono">[ApiAccessLogProps](Api#apiaccesslogprops)</span></span>

_Default_ : <span class="mono">true</span>

Enable CloudWatch access logs for this API


```js
new GraphQLApi(stack, "Api", {
  accessLog: true
});
```

```js
new GraphQLApi(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
});
```

### authorizers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">[ApiUserPoolAuthorizer](Api#apiuserpoolauthorizer)</span> | <span class="mono">[ApiJwtAuthorizer](Api#apijwtauthorizer)</span> | <span class="mono">[ApiLambdaAuthorizer](Api#apilambdaauthorizer)</span></span>&gt;</span>

Define the authorizers for the API. Can be a user pool, JWT, or Lambda authorizers.


```js
new GraphQLApi(stack, "Api", {
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

### codegen?

_Type_ : <span class="mono">string</span>

Path to graphql-codegen configuration file


```js
new GraphQLApi(stack, "api", {
  codegen: "./graphql/codegen.yml"
})
```

### cors?

_Type_ : <span class='mono'><span class="mono">boolean</span> | <span class="mono">[ApiCorsProps](Api#apicorsprops)</span></span>

_Default_ : <span class="mono">true</span>

CORS support applied to all endpoints in this API



```js
new GraphQLApi(stack, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
});
```


### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[ApiDomainProps](Api#apidomainprops)</span></span>

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)


```js
new GraphQLApi(stack, "Api", {
  customDomain: "api.example.com"
})
```

```js
new GraphQLApi(stack, "Api", {
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

_Type_ : <span class='mono'><span class="mono">"none"</span> | <span class="mono">"iam"</span> | <span class="mono">Omit&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">"none"</span> | <span class="mono">"iam"</span></span>&gt;</span></span>

The default authorizer for all the routes in the API.


```js
new GraphQLApi(stack, "Api", {
  defaults: {
    authorizer: "iam",
  }
});
```


```js
new GraphQLApi(stack, "Api", {
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

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new GraphQLApi(stack, "Api", {
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

_Type_ : <span class='mono'><span class="mono">"1.0"</span> | <span class="mono">"2.0"</span></span>

_Default_ : <span class="mono">"2.0"</span>

The [payload format version](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html#http-api-develop-integrations-lambda.proxy-format) for all the endpoints in the API.


### defaults.throttle.burst?

_Type_ : <span class="mono">number</span>

The [burst rate](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html) of the number of concurrent request for all the routes in the API.


```js
new GraphQLApi(stack, "Api", {
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
new GraphQLApi(stack, "Api", {
  defaults: {
    throttle: {
      rate: 10
    }
  }
})
```



### rootPath?

_Type_ : <span class="mono">string</span>

### server

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Path to function that will be invoked to resolve GraphQL queries.


```js
new GraphQLApi(stack, "api", {
  codegen: "./graphql/codegen.yml"
})
```


### cdk.httpApi?

_Type_ : <span class='mono'><span class="mono">[IHttpApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IHttpApi.html)</span> | <span class="mono">[HttpApiProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.HttpApiProps.html)</span></span>

Import the underlying HTTP API or override the default configuration


```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new GraphQLApi(stack, "Api", {
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
Note that, a default stage is automatically created, unless the `cdk.httpApi.createDefaultStage` is set to `false.


```js
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new GraphQLApi(stack, "Api", {
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
An instance of `GraphQLApi` has the following properties.
### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

If custom domain is enabled, this is the custom domain URL of the Api.
:::note
If you are setting the base mapping for the custom domain, you need to include the trailing slash while using the custom domain URL. For example, if the [`domainName`](#domainname) is set to `api.domain.com` and the [`path`](#path) is `v1`, the custom domain URL of the API will be `https://api.domain.com/v1/`.
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

### serverFunction

_Type_ : <span class="mono">[Function](Function#function)</span>

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
An instance of `GraphQLApi` has the following methods.
### addRoutes

```ts
addRoutes(scope, routes)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __routes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[ApiFunctionRouteProps](Api#apifunctionrouteprops)</span> | <span class="mono">[ApiHttpRouteProps](Api#apihttprouteprops)</span> | <span class="mono">[ApiAlbRouteProps](Api#apialbrouteprops)</span> | <span class="mono">[ApiGraphQLRouteProps](Api#apigraphqlrouteprops)</span> | <span class="mono">[ApiPothosRouteProps](Api#apipothosrouteprops)</span></span>&gt;</span>


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


### getConstructMetadata

```ts
getConstructMetadata()
```
### getFunction

```ts
getFunction(routeKey)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `GET /notes`.


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
- __cors__ <span class='mono'><span class="mono">boolean</span> | <span class="mono">[ApiCorsProps](Api#apicorsprops)</span></span>


Binds the given list of resources to a specific route.


```js
const api = new Api(stack, "Api");

api.setCors({
  allowMethods: ["GET"],
});
```

