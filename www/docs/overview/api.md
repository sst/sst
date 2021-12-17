---
title: Api 🟢
description: "How to create an API in your SST app"
---

import TabItem from "@theme/TabItem";
import MultiApiCode from "@site/src/components/MultiApiCode";

SST offers a copule of ways to create an API. Depending on the use case, you can choose the ones that fit the need.

## RESTful API

The [Api](../constructs/Api.md) construct uses [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) behind the scene. It enables you to create RESTful APIs with low latency and low cost.

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

### Catch-all route

Add a catch-all route to catch requests that don't match any other routes.

```js {5}
new Api(this, "Api", {
  routes: {
    "GET    /notes": "src/list.main",
    "POST   /notes": "src/create.main",
    "$default"     : "src/default.main",
  },
});
```

:::info Example (TODO)

This tutorial steps through building a simple RESTful API.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-create-a-rest-api-with-serverless.html)

:::

### API Gateway V1

The [ApiGatewayV1Api](../constructs/ApiGatewayV1Api.md) construct offers another way to create RESTful APIs similar to the Api construct. ApiGatewayV1Api offers more features than the Api construct, like Usage Plans and API keys, at the cost of higher latency and higher cost. It is recommended to use the `Api` construct first, and fall back to using `ApiGatewayV1Api`.

## GraphQL API

The [ApolloApi](../constructs/ApolloApi.md) makes it easy to create a GraphQL API using [Apollo Server](https://www.apollographql.com/docs/apollo-server/). This construct also uses [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) behind the scene.

```js
import { ApolloApi } from "@serverless-stack/resources";

new ApolloApi(this, "Api", {
  server: "src/graphql.handler",
});
```

:::info Example (TODO)

This tutorial steps through building a serverless GraphQL API with Apollo.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-create-an-apollo-graphql-api-with-serverless.html)

:::

## WebSocket API

The [WebSocketApi](../constructs/WebSocketApi.md) construct uses [API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html) behind the scene. It enables you to create a WebSocket APIs and helps you with all aspects of the API lifecycle.

```js
import { WebSocketApi } from "@serverless-stack/resources";

new WebSocketApi(this, "Api", {
  routes: {
    $connect: "src/connect.main",
    $default: "src/default.main",
    $disconnect: "src/disconnect.main",
    sendMessage: "src/sendMessage.main",
  },
});
```

:::info Example (TODO)

This tutorial steps through building a simple WebSocket API.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-create-a-websocket-api-with-serverless.html)

:::

## Authentication

### JWT via Cognito User Pool

If you are using Cognito User Pool to manager your users, User Pool can issue JSON web tokens (JWT) that you can use to authorize the API.

```js
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

const auth = new Auth(this, "Auth", { ... });

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpUserPoolAuthorizer({
    userPool: auth.cognitoUserPool,
    userPoolClients: [auth.cognitoUserPoolClient],
  }),
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::info Example

This tutorial steps through adding JWT authentication with Cognito.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-add-jwt-authorization-with-cognito-user-pool-to-a-serverless-api.html)

:::

### JWT via third-party auth provider

If you are using a third-party auth provider like [Auth0](https://auth0.com), you can use Auth0-issued JWT to authorize the API.

```js
import { HttpJwtAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers";

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.JWT,
  defaultAuthorizer: new HttpJwtAuthorizer({
    jwtAudience: ["UsGRQJJz5sDfPQDs6bhQ9Oc3hNISuVif"],
    jwtIssuer: "https://myorg.us.auth0.com",
  }),
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

:::info Example

This tutorial steps through adding JWT authentication with Auth0.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-add-jwt-authorization-with-auth0-to-a-serverless-api.html)

:::

### Cognito Identity Pool

You can use Cognito Identity Pool to grant temporary IAM permissions for users in your Cognito User Pool or 3rd party auth provider. See [`Auth`](./Auth.md) for configuring Identity Pool.

```js
const auth = new Auth(this, "Auth", { ... });

new Api(this, "Api", {
  defaultAuthorizationType: ApiAuthorizationType.AWS_IAM,
  routes: {
    "GET /": "src/lambda.main",
  },
});

// Granting permissions to authenticated users
auth.attachPermissionsForAuthUsers([api]);
```

In your web app, you can use the `aws-amplify` library to call the Api.

```js
import { API } from "aws-amplify";

await API.get("MyApi", "/");
```

:::info Example

This tutorial steps through authenticating with Cognito User Pool and Identity Pool.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-add-cognito-authentication-to-a-serverless-api.html)

:::

## Domain

After you deploy your API, you will get an auto-generated endpoint. You can configure a custom domain for the endpoint.

<MultiApiCode>
<TabItem value="api">

```js
new Api(this, "Api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

</TabItem>
<TabItem value="apollo">

```js
new ApolloApi(this, "GraphApi", {
  customDomain: "graph.domain.com",
  server: "src/server.handler",
});
```

</TabItem>
<TabItem value="websocket">

```js
new WebSocketApi(this, "WebSocketApi", {
  customDomain: "ws.domain.com",
  routes: {
    $default: "src/default.main",
  },
});
```

</TabItem>
</MultiApiCode>

## Access Log

Access log is enabled by default for all APIs. The default log format is a JSON string. The log format can be customized.

<MultiApiCode>
<TabItem value="api">

```js
new Api(this, "Api", {
  // Write access log in CSV format
  accessLog: "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

</TabItem>
<TabItem value="apollo">

```js
new ApolloApi(this, "GraphApi", {
  // Write access log in CSV format
  accessLog: "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  server: "src/server.handler",
});
```

</TabItem>
<TabItem value="websocket">

```js
new WebSocketApi(this, "WebSocketApi", {
  // Write access log in CSV format
  accessLog: "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    $default: "src/default.main",
  },
});
```

</TabItem>
</MultiApiCode>

## CORS

CORS allows web apps hosted on a different domain as the API to make requests. So if the web app is hosted under `www.example.com`, and the API is hosted under `api.example.com`, CORS is required. Otherwise, the web app will not be able to call the API.

CORS is enabled by default for Api and ApolloApi to allow all HTTP methods with all HTTP headers from any origin. You can override this default behavior.

<MultiApiCode>
<TabItem value="api">

```js
import { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2";

new Api(this, "Api", {
  cors: {
    allowHeaders: ["Authorization"],
    allowMethods: [apig.CorsHttpMethod.ANY],
    allowOrigins: ["https://www.example.com"],
  },
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

</TabItem>
<TabItem value="apollo">

```js
new ApolloApi(this, "GraphApi", {
  cors: {
    allowHeaders: ["Authorization"],
    allowMethods: [apig.CorsHttpMethod.ANY],
    allowOrigins: ["https://www.example.com"],
  },
  server: "src/server.handler",
});
```

</TabItem>
</MultiApiCode>

## AppSync API

[AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html) is a service for creating and managing GraphQL APIs that's fully managed by AWS. It has built-in features like caching to improve performance, subscriptions to support real-time updates, a GraphQL schema editing GUI, etc.

You can use the [AppSyncApi](../constructs/AppSyncApi.md) construct to create an AppSync API.

```js
import { AppSyncApi } from "@serverless-stack/resources";

new AppSyncApi(this, "GraphqlApi", {
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

:::info Example (TODO)

This tutorial steps through building a serverless GraphQL API with AppSync.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-create-a-serverless-graphql-api-with-aws-appsync.html)

:::
