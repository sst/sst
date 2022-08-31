---
title: API
description: "Learn to create REST, GraphQL, and WebSocket APIs in your SST app."
---

import TabItem from "@theme/TabItem";
import MultiApiCode from "@site/src/components/MultiApiCode";

SST makes it easy to create serverless APIs. Depending on your use case, you can create a standard REST API, GraphQL API, or WebSocket API.

Let's look at them in detail below.

## RESTful API

To create simple RESTful APIs you can use the [`Api`](constructs/Api.md) construct. Behind the scenes it uses the [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html). It enables you to create serverless RESTful APIs with low latency and low cost.

```js
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

It makes it easy to add routes and have Lambda functions respond to them.

:::tip Example

Here's a tutorial on how to build a simple SST app with a RESTful API.

[READ TUTORIAL](https://sst.dev/examples/how-to-create-a-rest-api-with-serverless.html)

:::

The [SST Console](console.md) also gives you a way to make HTTP requests to your API routes.

![SST Console API tab](/img/console/sst-console-api-tab.png)

### Catch-all route

You can also add a catch-all route to catch requests that don't match any other routes.

```js {5}
new Api(stack, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    $default: "src/default.main",
  },
});
```

## GraphQL API

To create a serverless GraphQL API, use the [`GraphQLApi`](constructs/GraphQLApi.md) construct. It uses [Apollo Server](https://www.apollographql.com/docs/apollo-server/) and [Amazon API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html).

```js
import { GraphQLApi } from "@serverless-stack/resources";

new GraphQLApi(stack, "Api", {
  server: "src/graphql.handler",
});
```

:::tip Example

Here's a tutorial on building a serverless GraphQL API with Apollo.

[READ TUTORIAL](https://sst.dev/examples/how-to-create-an-apollo-graphql-api-with-serverless.html)

:::

The [SST Console](console.md) also gives you a way to query your GraphQL endpoints.

![SST Console GraphQL tab](/img/console/sst-console-graphql-tab.png)

## WebSocket API

To create a WebSocket API use the [`WebSocketApi`](constructs/WebSocketApi.md) construct. It uses [Amazon API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html) behind the scenes. And enables you to create serverless WebSocket APIs and helps you with WebSocket lifecycle.

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

:::tip Example

Follow this tutorial to create a simple SST app with a WebSocket API.

[READ TUTORIAL](https://sst.dev/examples/how-to-create-a-websocket-api-with-serverless.html)

:::

## Authentication

APIs in SST support a few different forms of authentication.

### JWT via Cognito User Pool

You can use the [`Cognito`](constructs/Cognito.md) construct with [Cognito User Pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html) to manager your users. It can issue JSON web tokens (JWT) that you can use to authorize access to the API.

```js
const auth = new Cognito(stack, "Auth", { ... });

new Api(stack, "Api", {
  authorizers: {
    pool: {
      type: "user_pool",
      userPool: {
        id: auth.userPoolId,
      },
    },
  },
  defaults: {
    authorizer: "pool",
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::tip Example

Learn more about adding JWT authentication to your API with Cognito User Pool.

[READ TUTORIAL](https://sst.dev/examples/how-to-add-jwt-authorization-with-cognito-user-pool-to-a-serverless-api.html)

:::

### JWT via third-party auth provider

If you want to use a third-party auth provider like [Auth0](https://auth0.com), you can use Auth0-issued JWT to authorize the API.

```js
new Api(stack, "Api", {
  authorizers: {
    auth0: {
      type: "jwt",
      jwt: {
        audience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
        issuer: "https://myorg.us.auth0.com",
      },
    },
  },
  defaults: {
    authorizer: "auth0",
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::tip Example

Check out this example on adding JWT authentication with Auth0 to your API.

[READ TUTORIAL](https://sst.dev/examples/how-to-add-jwt-authorization-with-auth0-to-a-serverless-api.html)

:::

### Cognito Identity Pool

You can also use Cognito Identity Pool to grant temporary IAM permissions for users in your Cognito User Pool or 3rd party auth provider. Take a look at the [`Cognito`](constructs/Cognito.md) on how to configure an Identity Pool.

```js
const auth = new Cognito(stack, "Auth", { ... });

new Api(stack, "Api", {
  defaults: {
    authorizer: "iam",
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});

// Granting permissions to authenticated users
auth.attachPermissionsForAuthUsers(stack, [api]);
```

In your web app, you can use the [aws-amplify](https://www.npmjs.com/package/aws-amplify) package to call the authenticated API.

```js
import { API } from "aws-amplify";

await API.get("MyApi", "/");
```

:::tip Example

Here's a tutorial on authenticating an API with Cognito User Pool and Identity Pool.

[READ TUTORIAL](https://sst.dev/examples/how-to-add-cognito-authentication-to-a-serverless-api.html)

:::

## Custom domains

After you deploy your API, you'll get an auto-generated AWS endpoint. SST makes it easy to configure a custom domain for your API.

<MultiApiCode>
<TabItem value="api">

```js {2}
new Api(stack, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

</TabItem>
<TabItem value="graph">

```js {2}
new GraphQLApi(stack, "GraphApi", {
  customDomain: "graph.domain.com",
  server: "src/server.handler",
});
```

</TabItem>
<TabItem value="websocket">

```js {2}
new WebSocketApi(stack, "WebSocketApi", {
  customDomain: "ws.domain.com",
  routes: {
    $default: "src/default.main",
  },
});
```

</TabItem>
</MultiApiCode>

## Access logs

Access logs are enabled by default for all APIs. The default log format is a JSON string. This can be customized.

<MultiApiCode>
<TabItem value="api">

```js {3}
new Api(stack, "Api", {
  // Write access log in CSV format
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

</TabItem>
<TabItem value="graph">

```js {3}
new GraphQLApi(stack, "GraphApi", {
  // Write access log in CSV format
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  server: "src/server.handler",
});
```

</TabItem>
<TabItem value="websocket">

```js {3}
new WebSocketApi(stack, "WebSocketApi", {
  // Write access log in CSV format
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    $default: "src/default.main",
  },
});
```

</TabItem>
</MultiApiCode>

## CORS

[CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) allows web apps hosted on a different domains (compared to the API) to make requests. So if the web app is hosted under `www.example.com`, and the API is hosted under `api.example.com`, you'll need to enable CORS.

CORS is enabled by default for the `Api` construct to allow all HTTP methods with all HTTP headers from any origin. You can override this default behavior.

```js {4-8}
new Api(stack, "Api", {
  cors: {
    allowHeaders: ["Authorization"],
    allowMethods: ["ANY"],
    allowOrigins: ["https://www.example.com"],
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

The same applies to the `GraphQLApi` construct as well.

```js {4-8}
new GraphQLApi(stack, "GraphApi", {
  cors: {
    allowHeaders: ["Authorization"],
    allowMethods: ["ANY"],
    allowOrigins: ["https://www.example.com"],
  },
  server: "src/server.handler",
});
```

## AppSync API

[AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html) is a fully-managed GraphQL service by AWS. It has built-in features like caching to improve performance, subscriptions to support real-time updates, a GraphQL schema editing GUI, and more.

You can use the [`AppSyncApi`](constructs/AppSyncApi.md) construct to create an AppSync API.

```js
import { AppSyncApi } from "@serverless-stack/resources";

new AppSyncApi(stack, "GraphqlApi", {
  graphqlApi: {
    schema: "graphql/schema.graphql",
  },
  dataSources: {
    notesDS: "src/notes.main",
  },
  resolvers: {
    "Query    listNotes": "notesDS",
    "Query    getNoteById": "notesDS",
    "Mutation createNote": "notesDS",
    "Mutation updateNote": "notesDS",
    "Mutation deleteNote": "notesDS",
  },
});
```

:::tip Example

Learn how to add an AppSync GraphQL API to your SST app.

[READ TUTORIAL](https://sst.dev/examples/how-to-create-a-serverless-graphql-api-with-aws-appsync.html)

:::
