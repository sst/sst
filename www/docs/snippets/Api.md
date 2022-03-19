---
description: "Snippets for the sst.Api construct"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The `Api` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

## Using the minimal config

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

Note that, the route key can have extra spaces in between, they are just ignored.

## Working with routes

### Using `ANY` methods

You can use the `ANY` method to match all methods that you haven't defined.

```js {4}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "ANY    /notes": "src/any.main",
  },
});
```

### Using path variable

```js {4}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "GET    /notes/{id}": "src/get.main",
  },
});
```

### Using greedy path variable

A path variable `{proxy+}` catches all child routes. The greedy path variable must be at the end of the resource path.

```js {4}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "GET    /notes/{proxy+}": "src/greedy.main",
  },
});
```

### Using catch-all route

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

## Adding routes

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

## Lazily adding routes

Create an _empty_ Api construct and lazily add the routes.

```js {3-6}
const api = new Api(this, "Api");

api.addRoutes(this, {
  "GET    /notes": "src/list.main",
  "POST   /notes": "src/create.main",
});
```

## Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-6}
new Api(this, "Api", {
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

## Using the full config

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

Note that, you can set the `defaultFunctionProps` while using the `function` per route. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Api(this, "Api", {
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

So in the above example, the `GET /notes` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

## Configuring the Http Api

Configure the internally created CDK `Api` instance.

```js {2-6}
new Api(this, "Api", {
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

## Importing an existing Http Api

Override the internally created CDK `HttpApi` instance.

```js {4-8}
import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";

new Api(this, "Api", {
  cdk: {
    httpApi: HttpApi.fromHttpApiAttributes(this, "MyHttpApi", {
      httpApiId,
    }),
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

## Configuring access log

### Configuring the log format

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

### Configuring the log retention setting

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

## Configuring CORS

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

## Configuring custom domains

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Using the basic config

```js {2}
new Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Configuring with a wildcard

```js {2}
new Api(this, "Api", {
  customDomain: "*.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Using the full config

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

### Mapping multiple APIs to the same domain

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

### Importing an existing API Gateway custom domain

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

### Importing an existing certificate

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

### Specifying a hosted zone

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

### Loading domain name from SSM parameter

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

### Using externally hosted domain

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

## Attaching permissions

You can attach a set of permissions to all or some of the routes.

### For the entire API

Allow the entire API to access S3.

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

api.attachPermissions(["s3"]);
```

### For a specific route

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

## Adding auth

You can use IAM, JWT, or a Lambda authorizer to add auth to your APIs.

### Adding IAM authorization

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `AWS_IAM` and using the [`Auth`](Auth.md) construct.

```js {2}
new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

### Adding IAM authorization to a specific route

You can also secure specific routes in your APIs by setting the `authorizationType` to `AWS_IAM` and using the [`Auth`](Auth.md) construct.

```js {5}
new Api(this, "Api", {
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizationType: ApiAuthorizationType.AWS_IAM,
      function: "src/private.main",
    },
  },
});
```

### Adding JWT authorization

[JWT](https://jwt.io/introduction) allows authorized users to access your API. Note that, this is a different authorization method when compared to using `AWS_IAM` and the [`Auth`](Auth.md) construct, which allows you to secure other AWS resources as well.

```js {4-7}
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpJwtAuthorizer("Authorizer", "https://myorg.us.auth0.com", {
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Adding JWT authorization to a specific route

You can also secure specific routes using JWT by setting the `authorizationType` per route.

```js {10}
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

new Api(this, "Api", {
  defaultAuthorizer: new HttpJwtAuthorizer("Authorizer", "https://myorg.us.auth0.com", {
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
  }),
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizationType: ApiAuthorizationType.JWT,
      function: "src/private.main",
    },
  },
});
```

### Using Cognito User Pool as the JWT authorizer

JWT can also use a Cognito User Pool as an authorizer.

```js {4-8}
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpUserPoolAuthorizer("Authorizer", userPool, {
    userPoolClients: [userPoolClient],
  }),
  defaultAuthorizationScopes: ["user.id", "user.email"],
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Adding Lambda authorization

You can also use a Lambda function to authorize users to access your API. Like `JWT` and `AWS_IAM`, the Lambda authorizer is another way to secure your API.

```js {10-14}
import { Duration } from "aws-cdk-lib";
import { HttpLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { Function, Api } from "@serverless-stack/resources";

const authorizer = new Function(this, "AuthorizerFn", {
  handler: "src/authorizer.main",
});

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
  defaultAuthorizer: new HttpLambdaAuthorizer("Authorizer", authorizer, {
    authorizerName: "LambdaAuthorizer",
    resultsCacheTtl: Duration.seconds(30),
  }),
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

Note that `resultsCacheTtl` configures how long the authorization result will be cached. To disable caching, set `resultsCacheTtl` to `Duration.seconds(0)`. 

### Adding Lambda authorization to a specific route

You can also secure specific routes using a Lambda authorizer by setting the `authorizationType` per route.

```js {13}
import { HttpLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { Function, Api } from "@serverless-stack/resources";

const authorizer = new Function(this, "AuthorizerFn", {
  handler: "src/authorizer.main",
});

new Api(this, "Api", {
  defaultAuthorizer: new HttpLambdaAuthorizer("Authorizer", authorizer, {
    authorizerName: "LambdaAuthorizer",
  }),
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      authorizationType: ApiAuthorizationType.CUSTOM,
      function: "src/private.main",
    },
  },
});
```
## Configuring throttling


```js {2-3}
new Api(this, "Api", {
  defaultThrottlingRateLimit: 2000,
  defaultThrottlingBurstLimit: 100,
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

## Getting the function for a route

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

## Configuring ALB routes

You can configure a route to integrate with Application Load Balancers in your VPC.

```js {3}
new Api(this, "Api", {
  routes: {
    "GET /": { albListener },
  },
});
```

## Configuring HTTP proxy routes

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

## Sharing an API across stacks

You can create the Api construct in one stack, and add routes in other stacks. To do this, expose the Api as a class property.

<MultiLanguageCode>
<TabItem value="js">

```js {7-12} title="stacks/MainStack.js"
import { Api, Stack } from "@serverless-stack/resources";

export class MainStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.api = new Api(this, "Api", {
      routes: {
        "GET    /notes": "src/list.main",
        "POST   /notes": "src/create.main",
      },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```js {4,9-14} title="stacks/MainStack.ts"
import { Api, App, Stack, StackProps } from "@serverless-stack/resources";

export class MainStack extends Stack {
  public readonly api: Api;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    this.api = new Api(this, "Api", {
      routes: {
        "GET    /notes": "src/list.main",
        "POST   /notes": "src/create.main",
      },
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

Then pass the Api to a different stack. Behind the scenes, the Api Id is exported as an output of the `MainStack`, and imported to `AnotherStack`.

<MultiLanguageCode>
<TabItem value="js">

```js {3} title="stacks/index.js"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", { api: mainStack.api });
```

</TabItem>
<TabItem value="ts">

```ts {3} title="stacks/index.ts"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", { api: mainStack.api });
```

</TabItem>
</MultiLanguageCode>

Finally, call `addRoutes`. Note that the AWS resources for the added routes will be created in `AnotherStack`.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/AnotherStack.js"
import { Stack } from "@serverless-stack/resources";

export class AnotherStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    props.api.addRoutes(this, {
      "GET    /notes/{id}": "src/get.main",
      "PUT    /notes/{id}": "src/update.main",
      "DELETE /notes/{id}": "src/delete.main",
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```ts title="stacks/AnotherStack.ts"
import { Api, App, Stack, StackProps } from "@serverless-stack/resources";

interface AnotherStackProps extends StackProps {
  readonly api: Api;
}

export class AnotherStack extends Stack {
  constructor(scope: App, id: string, props: AnotherStackProps) {
    super(scope, id, props);

    props.api.addRoutes(this, {
      "GET    /notes/{id}": "src/get.main",
      "PUT    /notes/{id}": "src/update.main",
      "DELETE /notes/{id}": "src/delete.main",
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

### Sharing an API authorizer

If a `defaultAuthorizer` is configured for the Api, it will be applied to all routes, across all stacks.

```js {4-10} title="stacks/MainStack.js"
import { HttpLambdaAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";

const api = new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.CUSTOM,
  defaultAuthorizer: new HttpLambdaAuthorizer({
    authorizerName: "LambdaAuthorizer",
    handler: new sst.Function(this, "Authorizer", {
      handler: "src/authorizer.main",
    }),
  }),
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
  },
});

this.api = api;
```

```js title="stacks/AnotherStack.js"
props.api.addRoutes(this, {
  "GET    /notes/{id}": "src/get.main",
  "PUT    /notes/{id}": "src/update.main",
  "DELETE /notes/{id}": "src/delete.main",
});
```

In this case, tTypeScripthe 3 routes added in the second stack are also secured by the Lambda authorizer.

## Using 1 role for all routes

By default, `Api` creates 1 [`IAM role`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-iam.Role.html) for each Function handling a route. To have all Functions reuse the same role, manually create a role, and pass it into `defaultFunctionProps`.

Use [`managedPolicies`](managedPolicies) and [`inlinePolicies`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-iam.Role.html#inlinepolicies) to grant IAM permissions for the role.

```js {9-11}
import * as iam from "aws-cdk-lib/aws-iam";

const role = new iam.Role(this, "ApiRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
  managedPolicies: [
    {
      managedPolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    },
    // optionally add more managed policies
  ],
  inlinePolicies: {
    // optionally add more inline policies
  },
});

new Api(this, "Api", {
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
