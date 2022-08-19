import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The Api construct is a higher level CDK construct that makes it easy to create an API. It provides a simple way to define the routes in your API. And allows you to configure the specific Lambda functions if necessary. It also allows you to configure authorization and custom domains.

## Examples

The `Api` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```ts
import { Api } from "@serverless-stack/resources";

new Api(stack, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});
```

### Configuring routes

#### Using `ANY` methods

You can use the `ANY` method to match all methods that you haven't defined.

```js {4}
new Api(stack, "Api", {
  routes: {
    "GET /notes": "src/list.main",
    "ANY /notes": "src/any.main",
  },
});
```

#### Using path variable

```js {4}
new Api(stack, "Api", {
  routes: {
    "GET /notes"     : "src/list.main",
    "GET /notes/{id}": "src/get.main",
  },
});
```

#### Using greedy path variable

A path variable `{proxy+}` catches all child routes. The greedy path variable must be at the end of the resource path.

```js {4}
new Api(stack, "Api", {
  routes: {
    "GET /notes"         : "src/list.main",
    "GET /notes/{proxy+}": "src/greedy.main",
  },
});
```

#### Using catch-all route

To add a catch-all route, add a route called `$default`. This will catch requests that don't match any other routes.

```js {5}
new Api(stack, "Api", {
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
    "$default"   : "src/default.main",
  },
});
```

#### Lazily adding routes

Add routes after the API has been created.

```js
const api = new Api(stack, "Api", {
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});

api.addRoutes(stack, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

### Configuring Function routes

#### Specifying function props for all the routes

You can set some function props and have them apply to all the routes.

```js {2-8}
new Api(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

#### Configuring an individual route

Configure each Lambda function separately.

```js
new Api(stack, "Api", {
  routes: {
    "GET /notes": {
      function: {
        handler: "src/list.main",
        timeout: 20,
        environment: { tableName: table.tableName },
        permissions: [table],
      },
    },
  },
});
```

Note that, you can set the `defaults.function` while using the `function` per route. The `function` will just override the `defaults.function`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Api(stack, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
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

#### Attaching permissions for the entire API

Allow the entire API to access S3.

```js {11}
const api = new Api(stack, "Api", {
  routes: {
    "GET    /notes"     : "src/list.main",
    "POST   /notes"     : "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

api.attachPermissions(["s3"]);
```

#### Attaching permissions for a specific route

Allow one of the routes to access S3.

```js {11}
const api = new Api(stack, "Api", {
  routes: {
    "GET    /notes"     : "src/list.main",
    "POST   /notes"     : "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});

api.attachPermissionsToRoute("GET /notes", ["s3"]);
```

#### Getting the function for a route

```js {11}
const api = new Api(stack, "Api", {
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

### Configuring ALB routes

You can configure a route to integrate with Application Load Balancers in your VPC.

```js
new Api(stack, "Api", {
  routes: {
    "GET /": {
      type: "alb",
      cdk: {
        albListener,
      }
    },
  },
});
```

### Configuring HTTP proxy routes

You can configure a route to pass the entire request to a publicly routable HTTP endpoint.

```js
new Api(stack, "Api", {
  routes: {
    "GET /": {
      type: "url",
      url: "http://domain.com",
    },
  },
});
```

### Custom domains

You can configure the API with a custom domain hosted either on [Route 53](https://aws.amazon.com/route53/) or [externally](#using-externally-hosted-domain).

#### Using the basic config

```js {2}
new Api(stack, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Configuring with a wildcard

```js {2}
new Api(stack, "Api", {
  customDomain: "*.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Using the full config

```js {2-6}
new Api(stack, "Api", {
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

```js {11-13}
const usersApi = new Api(stack, "UsersApi", {
  customDomain: {
    domainName: "api.domain.com",
    path: "users",
  },
});

new Api(stack, "PostsApi", {
  customDomain: {
    path: "posts",
    cdk: {
      domainName: usersApi.cdk.domainName,
    }
  },
});
```

#### Importing an existing API Gateway custom domain

```js {6-12}
import { DomainName } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
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
    "GET /notes": "src/list.main",
  },
});
```

#### Importing an existing certificate

```js {6-8}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new Api(stack, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Specifying a hosted zone

If you have multiple hosted zones for a given domain, you can choose the one you want to use to configure the domain.

```js {6-11}
import { HostedZone } from "aws-cdk-lib/aws-route53";

new Api(stack, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, "MyZone", {
        hostedZoneId,
        zoneName,
      }),
    },
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

const rootDomain = StringParameter.valueForStringParameter(stack, `/myApp/domain`);

new Api(stack, "Api", {
  customDomain: {
    domainName: `api.${rootDomain}`,
    cdk: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, "MyZone", {
        hostedZoneId,
        zoneName,
      }),
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

Note that, normally SST will look for a hosted zone by stripping out the first part of the `domainName`. But this is not possible when the `domainName` is a reference. So you'll need to specify the `cdk.hostedZone` explicitly.

#### Using externally hosted domain

```js {5,7-9}
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";

new Api(stack, "Api", {
  customDomain: {
    isExternalDomain: true,
    domainName: "api.domain.com",
    cdk: {
      certificate: Certificate.fromCertificateArn(stack, "MyCert", certArn),
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

Note that you can also migrate externally hosted domains to Route 53 by [following this guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Authorization

You can use IAM, JWT, or a Lambda authorizer to add auth to your APIs.

#### Adding IAM authorization

You can secure all your API routess by setting the `defaults.authorizer`.

```js {2-4}
new Api(stack, "Api", {
  defaults: {
    authorizer: "iam",
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

#### Adding IAM authorization to a specific route

You can also secure specific routes in your API.

```js {5}
new Api(stack, "Api", {
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizer: "iam",
      function: "src/private.main",
    },
  },
});
```

#### Adding JWT authorization

[JWT](https://jwt.io/introduction) allows authorized users to access your API. Note that, this is a different authorization method when compared to using `iam`, which allows you to secure other AWS resources as well.

```js
new Api(stack, "Api", {
  authorizers: {
    myAuthorizer: {
      type: "jwt",
      jwt: {
        issuer: "https://myorg.us.auth0.com",
        audience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
      }
    },
  },
  defaults: {
    authorizer: "myAuthorizer",
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

#### Adding JWT authorization to a specific route

You can also secure specific routes using JWT by setting the `authorizer` per route.

```js {14}
new Api(stack, "Api", {
  authorizers: {
    myAuthorizer: {
      type: "jwt",
      jwt: {
        issuer: "https://myorg.us.auth0.com",
        audience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
      }
    },
  },
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizer: "myAuthorizer",
      function: "src/private.main",
    },
  },
});
```

#### Using Cognito User Pool as the JWT authorizer

JWT can also use a Cognito User Pool as an authorizer.

```js
new Api(stack, "Api", {
  authorizers: {
    myAuthorizer: {
      type: "user_pool",
      userPool: {
        id: userPool.userPoolId,
        clientIds: [userPoolClient.userPoolClientId],
      }
    },
  },
  defaults: {
    authorizer: "myAuthorizer",
    authorizationScopes: ["user.id", "user.email"],
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

#### Adding Lambda authorization

You can also use a Lambda function to authorize users to access your API. Like using JWT and IAM, the Lambda authorizer is another way to secure your API.

```js
import { Function, Api } from "@serverless-stack/resources";

new Api(stack, "Api", {
  authorizers: {
    myAuthorizer: {
      type: "lambda",
      function: new Function(stack, "Authorizer", {
        handler: "src/authorizer.main",
      }),
      resultsCacheTtl: "30 seconds",
    },
  },
  defaults: {
    authorizer: "myAuthorizer",
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

Note that `resultsCacheTtl` configures how long the authorization result will be cached.

#### Adding Lambda authorization to a specific route

You can also secure specific routes using a Lambda authorizer by setting the `authorizer` per route.

```js {16}
import { Function, Api } from "@serverless-stack/resources";

new Api(stack, "Api", {
  authorizers: {
    myAuthorizer: {
      type: "lambda",
      function: new Function(stack, "Authorizer", {
        handler: "src/authorizer.main",
      }),
      resultsCacheTtl: "30 seconds",
    },
  },
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizer: "myAuthorizer",
      function: "src/private.main",
    },
  },
});
```

#### Sharing an API authorizer

If `defaults.authorizer` is configured for the Api, it will be applied to all routes, across all stacks.

```js {11-13} title="stacks/MainStack.js"
const api = new Api(stack, "Api", {
  authorizers: {
    myAuthorizer: {
      type: "lambda",
      function: new Function(stack, "Authorizer", {
        handler: "src/authorizer.main",
      }),
      resultsCacheTtl: "30 seconds",
    },
  },
  defaults: {
    authorizer: "myAuthorizer",
  },
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
  },
});

this.api = api;
```

```js title="stacks/AnotherStack.js"
api.addRoutes(stack, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

In this case, the 3 routes added in the second stack are also secured by the Lambda authorizer.

### Access log

#### Configuring the log format

Use a CSV format instead of default JSON format.

```js {2-3}
new Api(stack, "Api", {
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Configuring the log retention setting

```js {2-4}
new Api(stack, "Api", {
  accessLog: {
    retention: "one_week",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {2-4}
new Api(stack, "Api", {
  cors: {
    allowMethods: ["GET"],
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Throttling

```js {2-7}
new Api(stack, "Api", {
  defaults: {
    throttle: {
      rate: 2000,
      burst: 100,
    }
  },
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

### Advanced examples

#### Configuring the Http Api

Configure the internally created CDK `HttpApi` instance.

```js {2-6}
new Api(stack, "Api", {
  cdk: {
    httpApi: {
      disableExecuteApiEndpoint: true,
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

#### Sharing an API across stacks

You can create the Api construct in one stack, and add routes in other stacks. To do this, return the API from your stack function.

```ts title="stacks/MainStack.ts"
import { Api, StackContext } from "@serverless-stack/resources";

export function MainStack({ stack }: StackContext) {
  const api = new Api(stack, "Api", {
    routes: {
      "GET    /notes": "src/list.main",
      "POST   /notes": "src/create.main",
    },
  });

  return {
    api
  }
}
```

Then in another stack, utilize `use` to import the first stack's API. Finally, call `addRoutes`. Note that the AWS resources for the added routes will be created in `AnotherStack`.

```ts title="stacks/AnotherStack.ts"
import { StackContext, use } from "@serverless-stack/resources";
import { MainStack } from "./MainStack"

export function AnotherStack({ stack }: StackContext) {
  const { api } = use(MainStack)
  api.addRoutes(stack, {
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  });
}
```

#### Using 1 role for all routes

By default, `Api` creates 1 [`IAM role`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-iam.Role.html) for each Function handling a route. To have all Functions reuse the same role, manually create a role, and pass it into `defaults.function`.

Use `attachPermissionsToRole` to grant IAM permissions for the role.

```js {21-25}
import * as iam from "aws-cdk-lib/aws-iam";
import { attachPermissionsToRole } from "@serverless-stack/resources";

// Create an IAM role
const role = new iam.Role(stack, "ApiRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [
    {
      managedPolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    }
  ]
});

// Attach permissions to role
attachPermissionsToRole(role, [
  // ie. table
]);

// Use the role for all routes
new Api(stack, "Api", {
  defaults: {
    function: {
      role,
    },
  },
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "GET    /notes/{id}": "src/get.main",
    "PUT    /notes/{id}": "src/update.main",
    "DELETE /notes/{id}": "src/delete.main",
  },
});
```

#### Creating Lambda container images

```js
import * as lambda from "aws-cdk-lib/aws-lambda";

const fn = new lambda.DockerImageFunction(stack, "DockerFunction", {
  code: lambda.DockerImageCode.fromImageAsset("path/to/Dockerfile/folder"),
});

new Api(stack, "Api", {
  routes: {
    "GET /": {
      cdk: {
        function: fn,
      }
    },
  },
});
```

#### Importing an existing Http Api

Override the internally created CDK `HttpApi` instance.

```js {4-8}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(stack, "Api", {
  cdk: {
    httpApi: HttpApi.fromHttpApiAttributes(stack, "MyHttpApi", {
      httpApiId,
    }),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```