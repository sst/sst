---
description: "Snippets for the sst.ApiGatewayV1Api construct"
---

The `ApiGatewayV1Api` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

## Using the minimal config

```js
import { ApiGatewayV1Api } from "@serverless-stack/resources";

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

## Adding routes

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

## Lazily adding routes

Create an _empty_ Api construct and lazily add the routes.

```js {3-6}
const api = new ApiGatewayV1Api(this, "Api");

api.addRoutes(this, {
  "GET    /notes": "src/list.main",
  "POST   /notes": "src/create.main",
});
```

## Adding catch-all route

Add routes after the API has been created.

```js
const api = new ApiGatewayV1Api(this, "Api", {
  routes: {
    "GET /notes": "src/list.main",
    "ANY /{proxy+}": "src/catch.main",
  },
});
```

## Specifying function props for all the routes

You can extend the minimal config, to set some function props and have them apply to all the routes.

```js {2-5}
new ApiGatewayV1Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
    },
  },
  routes: {
    "GET  /notes": "src/list.main",
    "POST /notes": "src/create.main",
  },
});
```

## Using the full config

If you wanted to configure each Lambda function separately, you can pass in the [`ApiGatewayV1ApiRouteProps`](#apigatewayv1apirouteprops).

```js
new ApiGatewayV1Api(this, "Api", {
  routes: {
    "GET /notes": {
      function: {
        srcPath: "src/",
        handler: "list.main",
        environment: { tableName: "NOTES_TABLE" },
      },
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per route. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, which will be merged.

```js
new ApiGatewayV1Api(this, "Api", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: "NOTES_TABLE" },
    },
  },
  routes: {
    "GET /notes": {
      function: {
        handler: "list.main",
        timeout: 10,
        environment: { bucketName: "NOTES_BUCKET" },
      },
    },
    "POST /notes": "create.main",
  },
});
```

So in the above example, the `GET /notes` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set.

## Configuring Regional endpoint

Configure the internally created CDK `RestApi` instance.

```js {5-7}
import { EndpointType } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(this, "Api", {
  restApi: {
    endpointConfiguration: {
      types: [EndpointType.REGIONAL],
    },
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

## Importing an existing Rest Api

Override the internally created CDK `RestApi` instance.

```js {4-7}
import { RestApi } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(this, "Api", {
  restApi: RestApi.fromRestApiAttributes(this, "MyRestApi", {
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

## Configuring access log

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

### Configuring the log retention setting

```js {3}
new ApiGatewayV1Api(this, "Api", {
  accessLog: {
    retention: "ONE_WEEK",
  }
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

## Configuring CORS

Override the default behavior of allowing all methods, and only allow the GET method.

```js {3-5}
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

## Configuring custom domains

You can also configure the API with a custom domain. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/). If your domains are hosted elsewhere, you can [follow this guide to migrate them to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

### Using the basic config

```js {2}
new ApiGatewayV1Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Using the full config

```js {4-9}
import { EndpointType } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    hostedZone: "domain.com",
    endpointType: EndpointType.EDGE,
    path: "v1",
  },
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

### Mapping multiple APIs to the same domain

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

### Importing an existing API Gateway custom domain

```js {5-9}
import { DomainName } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(this, "Api", {
  customDomain: {
    domainName: DomainName.fromDomainNameAttributes(this, "MyDomain", {
      domainName,
      domainNameAliasHostedZoneId,
      domainNameAliasTarget,
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

new ApiGatewayV1Api(this, "Api", {
  customDomain: {
    domainName: "api.domain.com",
    certificate: Certificate.fromCertificateArn(this, "MyCert", certArn),
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

new ApiGatewayV1Api(this, "Api", {
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

## Attaching permissions

You can attach a set of permissions to all or some of the routes.

### For the entire API

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

### For a specific route

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

## Adding auth

You can use IAM or JWT to add auth to your APIs.

### Adding IAM authorization

You can secure your APIs (and other AWS resources) by setting the `defaultAuthorizationType` to `IAM` and using the [`sst.Auth`](Auth.md) construct.

```js {4}
import { AuthorizationType } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(this, "Api", {
  defaultAuthorizationType: AuthorizationType.IAM,
  routes: {
    "GET  /notes": "list.main",
    "POST /notes": "create.main",
  },
});
```

### Adding IAM authorization to a specific route

You can also secure specific routes in your APIs by setting the `authorizationType` to `AWS_IAM` and using the [`sst.Auth`](Auth.md) construct.

```js {8-10}
import { AuthorizationType } from "aws-cdk-lib/aws-apigateway";

new ApiGatewayV1Api(this, "Api", {
  routes: {
    "GET /public": "src/public.main",
    "GET /private": {
      function: "src/private.main",
      methodOptions: {
        authorizationType: AuthorizationType.IAM,
      },
    },
  },
});
```

### Adding CUSTOM authorization

CUSTOM allows using a Lambda function to authorize users to access your API. Note that, this is a different authorization method when compared to using `AWS_IAM` and the [`sst.Auth`](Auth.md) construct, which allows you to secure other AWS resources as well.

```js {11-12}
import * as apigateway from "aws-cdk-lib/aws-apigateway";

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

### Adding CUSTOM authorization to a specific route

You can also secure specific routes using CUSTOM by setting the `authorizationType` per route.

```js {20-23}
import * as apigateway from "aws-cdk-lib/aws-apigateway";

const authorizer = new apigateway.RequestAuthorizer(this, "Authorizer", {
  handler: new Function(this, "AuthorizerFunction", {
    handler: "src/authorizer.main",
  }),
  identitySources: [apigateway.IdentitySource.header("Authorization")],
});

new ApiGatewayV1Api(this, "Api", {
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

### Using Cognito User Pool as the authorizer

You can also use Cognito User Pools as an authorizer.

```js {12-14}
import * as apigateway from "aws-cdk-lib/aws-apigateway";

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

## Getting the function for a route

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
