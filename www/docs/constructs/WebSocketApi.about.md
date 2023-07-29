The `WebSocketApi` construct is a higher level CDK construct that makes it easy to create a WebSocket API. It provides a simple way to define your routes and allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains. See the [examples](#examples) for more details.

## Examples

### Minimal Config

```js
import { WebSocketApi } from "sst/constructs";

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

api.addRoutes(stack, {
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
      },
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
const coreApi = new HttpApi(stack, "HttpApi", {
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
    },
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
      domainName: DomainName.fromDomainNameAttributes(stack, "MyDomain", {
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
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
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
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
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
import { Function, WebSocketApi } from "sst/constructs";

new WebSocketApi(stack, "Api", {
  authorizer: {
    type: "lambda",
    function: new Function(stack, "Authorizer", {
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

#### Using [SST Auth](/auth) 

No changes are required for your CDK construct, but inside of your `$connect` and `$default` functions, you can access the authenticated user's information using the hooks provided by Auth.

```ts
// src/connect.ts
import { WebSocketApiHandler } from 'sst/node/websocket-api';
import { useSession } from 'sst/node/auth';

export const handler = WebSocketApiHandler(async () => {
  const session = useSession();
  if (session.type === 'public') {
    return { statusCode: 401};
  }
  // Do something here...
  return {
    statusCode: 200,
  };
});

```

And to connect, remember to set your Authorization Header. Here's an example using [wscat](https://www.npmjs.com/package/wscat).

```sh
$ wscat -c wss://abcdef123.execute-api.us-west-2.amazonaws.com/production -H "authorization:Bearer jwt-from-auth"
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
