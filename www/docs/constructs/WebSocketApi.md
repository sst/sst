---
description: "Docs for the sst.WebSocketApi construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `WebSocketApi` construct is a higher level CDK construct that makes it easy to create a WebSocket API. It provides a simple way to define your routes and allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Constructor
```ts
new WebSocketApi(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[WebSocketApiProps](#websocketapiprops)</span>

## Examples

```js
import { WebSocketApi } from "@serverless-stack/resources";

new WebSocketApi(stack, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});
```


### Configuring routes

#### Lazily adding routes

Add routes after the API has been created.

```js
const api = new WebSocketApi(stack, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});

api.addRoutes(this, {
  sendMessage: "src/sendMessage.main",
});
```

#### Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-8}
new WebSocketApi(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      permissions: [table],
      environment: { tableName: table.tableName },
    },
  },
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});
```

#### Configuring an individual route

Configure each Lambda route separately.

```js
new WebSocketApi(stack, "Api", {
  routes: {
    $default: {
      function: {
        timeout: 20,
        handler: "src/default.main",
        permissions: [table],
        environment: { tableName: table.tableName },
      }
    },
  },
});
```

Note that, you can set the `defaults.functionProps` while using the `function` per route. The `function` will just override the `defaults.functionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new WebSocketApi(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      permissions: [table],
      environment: { tableName: table.tableName },
    },
  },
  routes: {
    $default: {
      function: {
        handler: "src/default.main",
        timeout: 10,
        permissions: [bucket],
        environment: { bucketName: bucket.bucketName },
      },
    },
    $connect: "src/connect.main",
  },
});
```

So in the above example, the `$default` function doesn't use the `timeout` that is set in the `defaults.functionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Getting the function for a route

```js {10}
const api = new WebSocketApi(stack, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});

const function = api.getFunction("sendMessage");
```

### Custom domains

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

#### Using the basic config

```js {2}
new WebSocketApi(stack, "Api", {
  customDomain: "api.domain.com",
  routes: {
    $default: "src/default.main",
  },
});
```

#### Configuring with a wildcard

```js {2}
new WebSocketApi(stack, "Api", {
  customDomain: "*.domain.com",
  routes: {
    $default: "src/default.main",
  },
});
```

#### Using the full config

```js {2-6}
new WebSocketApi(stack, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    path: "v1",
  },
  routes: {
    $default: "src/default.main",
  },
});
```

#### Mapping multiple APIs to the same domain

```js {11-13}
const coreApi = new HttpApi(this, "HttpApi", {
  customDomain: {
    domainName: "api.domain.com",
    path: "core",
  },
});

new WebSocketApi(stack, "WebSocketApi", {
  customDomain: {
    path: "chat",
    cdk: {
      domainName: coreApi.cdk.domainName,
    }
  },
});
```

#### Importing an existing API Gateway custom domain

```js {6-12}
import { DomainName } from "@aws-cdk/aws-apigatewayv2-alpha";

new WebSocketApi(stack, "Api", {
  customDomain: {
    path: "newPath",
    cdk: {
      domainName: DomainName.fromDomainNameAttributes(this, "MyDomain", {
        name,
        regionalDomainName,
        regionalHostedZoneId,
      }),
    },
  },
  routes: {
    $default: "src/default.main",
  },
});
```

#### Importing an existing certificate

```js {6-8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new WebSocketApi(stack, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
    },
  },
  routes: {
    $default: "src/default.main",
  },
});
```

#### Using externally hosted domain

```js {5,7-9}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new WebSocketApi(stack, "Api", {
  customDomain: {
    isExternalDomain: true,
    domainName: "api.domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
    },
  },
  routes: {
    $default: "src/default.main",
  },
});
```

Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Authorization

You can use IAM or a Lambda authorizer to add auth to your APIs.

#### Adding IAM authorization

You can secure all your API routes by setting the `defaults.authorizer`.

```js {2}
new WebSocketApi(stack, "Api", {
  authorizer: "iam",
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});
```

#### Adding Lambda authorization

You can also use a Lambda function to authorize users to access your API.

```js {4-9}
import { Function, WebSocketApi } from "@serverless-stack/resources";

new WebSocketApi(stack, "Api", {
  authorizer: {
    type: "lambda",
    function: new Function(this, "Authorizer", {
      handler: "src/authorizer.main",
    }),
  },
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
  },
});
```

### Access log

#### Configuring the log format

Use a CSV format instead of default JSON format.

```js {2-3}
new WebSocketApi(stack, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    $default: "src/default.main",
  },
});
```

#### Configuring the log retention setting

```js {2-4}
new WebSocketApi(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
  routes: {
    $default: "src/default.main",
  },
});
```

### Permissions

You can attach a set of permissions to all or some of the routes.

:::note
By default all routes are granted the `execute-api:ManageConnections` permission to manage the WebSocket connections.
:::

For example, the route handler functions have the permissions to make the `ApiGatewayManagementApi.postToConnection` call using the AWS SDK.

#### Attaching permissions for the entire API

Allow the entire API to access S3.

```js {10}
const api = new WebSocketApi(stack, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});

api.attachPermissions(["s3"]);
```

#### Attaching permissions for a specific route

Allow one of the routes to access S3.

```js {10}
const api = new WebSocketApi(stack, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});

api.attachPermissionsToRoute("$default", ["s3"]);
```

### Advanced examples

#### Configuring the WebSocket Api

Configure the internally created CDK `WebSocketApi` instance.

```js {2-6}
new WebSocketApi(stack, "Api", {
  cdk: {
    webSocketApi: {
      apiName: "chat-app-api",
    },
  },
  routes: {
    $default: "src/default.main",
  },
});
```

## WebSocketApiProps


### accessLog?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">boolean</span> | <span class="mono">[WebSocketApiAccessLogProps](#websocketapiaccesslogprops)</span></span>

Enable CloudWatch access logs for this API


```js
new WebSocketApi(stack, "Api", {
  accessLog: true
});
```


```js
new WebSocketApi(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
});
```

### authorizer?

_Type_ : <span class='mono'><span class="mono">"iam"</span> | <span class="mono">"none"</span> | <span class="mono">[WebSocketApiLambdaAuthorizer](#websocketapilambdaauthorizer)</span></span>

The default authorizer for the API.


```js
new WebSocketApi(stack, "Api", {
  authorizer: "iam",
});
```


```js
new WebSocketApi(stack, "Api", {
  authorizer: {
    type: "lambda",
    function: new WebSocketApi(stack, "Authorizer", {
      handler: "test/lambda.handler",
    }),
  },
});
```

### customDomain?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[WebSocketApiDomainProps](#websocketapidomainprops)</span></span>

Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)


```js
new WebSocketApi(stack, "Api", {
  customDomain: "api.example.com"
})
```


```js
new WebSocketApi(stack, "Api", {
  customDomain: {
    domainName: "api.example.com",
    hostedZone: "domain.com",
    path: "v1"
  }
})
```


### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new WebSocketApi(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
});
```


### routes?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[WebSocketApiFunctionRouteProps](#websocketapifunctionrouteprops)</span></span>&gt;</span>

The routes for the Websocket API


```js
new WebSocketApi(stack, "Api", {
  routes: {
    $connect    : "src/connect.main",
    $default    : "src/default.main",
    $disconnect : "src/disconnect.main",
    sendMessage : "src/sendMessage.main",
  }
})
```


### cdk.webSocketApi?

_Type_ : <span class='mono'><span class="mono">[IWebSocketApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IWebSocketApi.html)</span> | <span class="mono">[WebSocketApiProps](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketApiProps.html)</span></span>

Override the internally created WebSocket API


```js
new WebSocketApi(stack, "WebSocketApi", {
  cdk: {
    webSocketApi: {
      apiName: "my-websocket-api"
    }
  }
})
```

### cdk.webSocketStage?

_Type_ : <span class='mono'><span class="mono">[IWebSocketStage](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.IWebSocketStage.html)</span> | <span class="mono">[WebSocketApiCdkStageProps](#websocketapicdkstageprops)</span></span>

Override the internally created WebSocket Stage


```js
new WebSocketApi(stack, "WebSocketApi", {
  cdk: {
    webSocketStage: {
      autoDeploy: false
    }
  }
})
```


## Properties
An instance of `WebSocketApi` has the following properties.
### customDomainUrl

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">string</span></span>

Custom domain url if it's configured

### routes

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

List of routes of the websocket api

### url

_Type_ : <span class="mono">string</span>

Url of the WebSocket API


### cdk.accessLogGroup?

_Type_ : <span class="mono">[LogGroup](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.LogGroup.html)</span>

The internally created log group

### cdk.certificate?

_Type_ : <span class="mono">[Certificate](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.Certificate.html)</span>

The internally created certificate

### cdk.domainName?

_Type_ : <span class="mono">[DomainName](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.DomainName.html)</span>

The internally created domain name

### cdk.webSocketApi

_Type_ : <span class="mono">[WebSocketApi](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketApi.html)</span>

The internally created websocket api

### cdk.webSocketStage

_Type_ : <span class="mono">[WebSocketStage](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-alpha.WebSocketStage.html)</span>

The internally created websocket stage


## Methods
An instance of `WebSocketApi` has the following methods.
### addRoutes

```ts
addRoutes(scope, routes)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __routes__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[WebSocketApiFunctionRouteProps](#websocketapifunctionrouteprops)</span></span>&gt;</span>


Add routes to an already created WebSocket API


```js
api.addRoutes(stack, {
  "$connect": "src/connect.main",
})
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
api.attachPermissionsToRoute("$connect", ["s3"]);
```


### getFunction

```ts
getFunction(routeKey)
```
_Parameters_
- __routeKey__ <span class="mono">string</span>


Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `$connect`.


```js
const fn = api.getFunction("$connect");
```

## WebSocketApiDomainProps


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


## WebSocketApiCdkStageProps


### stageName?

_Type_ : <span class="mono">string</span>

## WebSocketApiAccessLogProps


### destinationArn?

_Type_ : <span class="mono">string</span>

### format?

_Type_ : <span class="mono">string</span>

### retention?

_Type_ : <span class='mono'><span class="mono">"one_day"</span> | <span class="mono">"three_days"</span> | <span class="mono">"five_days"</span> | <span class="mono">"one_week"</span> | <span class="mono">"two_weeks"</span> | <span class="mono">"one_month"</span> | <span class="mono">"two_months"</span> | <span class="mono">"three_months"</span> | <span class="mono">"four_months"</span> | <span class="mono">"five_months"</span> | <span class="mono">"six_months"</span> | <span class="mono">"one_year"</span> | <span class="mono">"thirteen_months"</span> | <span class="mono">"eighteen_months"</span> | <span class="mono">"two_years"</span> | <span class="mono">"five_years"</span> | <span class="mono">"ten_years"</span> | <span class="mono">"infinite"</span></span>

## WebSocketApiLambdaAuthorizer
Specify a Lambda authorizer and configure additional options.


```js
new WebSocketApi(stack, "Api", {
  authorizer: {
    type: "lambda",
    function: new Function(stack, "Authorizer", {
      handler: "test/lambda.handler",
    }),
  },
});
```

### function?

_Type_ : <span class="mono">[Function](Function#function)</span>

### identitySource?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

### name?

_Type_ : <span class="mono">string</span>

### type

_Type_ : <span class="mono">"lambda"</span>


### cdk.authorizer

_Type_ : <span class="mono">[WebSocketLambdaAuthorizer](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_aws-apigatewayv2-authorizers-alpha.WebSocketLambdaAuthorizer.html)</span>


## WebSocketApiFunctionRouteProps
Specify a function route handler and configure additional options


```js
api.addRoutes(stack, {
  sendMessage : {
    function: "src/sendMessage.main",
  }
});
```

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function definition used to create the function for this route.

### type?

_Type_ : <span class="mono">"function"</span>
