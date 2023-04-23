---
title: APIs
description: "Add a REST, GraphQL, or WebSocket APIs to your SST app."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Add a REST, GraphQL, or WebSocket APIs to your SST app.

</HeadlineText>

---

## Overview

While most modern frontends (like Next.js, or Remix) allow you to add API routes, it makes sense to add a dedicated API to your app as it grows larger. It allows you to support multiple clients and possibly have an API that's used directly by your users.

SST makes it easy to create serverless APIs. You can add a standard REST API, GraphQL API, or WebSocket API.

Let's look at them in detail.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

---

## Add an API

To add a REST API, add the following to your stacks.

```ts title="stacks/Default.ts"
const api = new Api(stack, "api", {
  routes: {
    "GET /": "packages/functions/src/time.handler",
  },
});
```

This creates an API with a single GET endpoint and points it to a function.

Let's print out the API URL in our app output.

```diff title="stacks/Default.ts"
stack.addOutputs({
+ ApiUrl: api.url,
  SiteUrl: site.url,
});
```

And make sure to import the [`Api`](constructs/Api.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Api, StackContext, NextjsSite } from "sst/constructs";
```

---

## Bind the API

After adding the API, bind your Next.js app to it.

```diff title="stacks/Default.ts"
const site = new NextjsSite(stack, "site", {
  path: "packages/web",
+ bind: [api],
});
```

This allows us to access the API in our Next.js app.

---

## Add the handler

Let's add the function that'll handle the new endpoint.

```ts title="packages/functions/src/time.ts"
import { ApiHandler } from "sst/node/api";

export const handler = ApiHandler(async (evt) => {
  return {
    statusCode: 200,
    body: evt.requestContext.time,
  };
});
```

Now once your app is updated it'll print out the new API URL in the terminal. And if you go to that URL in your browser, you'll notice it prints out the time!

---

## Call the API

Let's make a request to the API in our Next.js app.

```ts title="functions/web/pages/index.ts" {4}
import { Api } from "sst/node/api";

export async function getServerSideProps() {
  const results = await fetch(Api.api.url);
  console.log(await results.text());

  return { props: { loaded: true } };
}
```

Now if you refresh your Next.js app locally, it'll print the time in the Next.js terminal!

:::tip Tutorial
[Check out a tutorial](https://sst.dev/examples/how-to-create-a-crud-api-with-serverless-using-dynamodb.html) on how to build a CRUD API with SST.
:::

---

## Custom domains

After you deploy your API, you'll get an auto-generated AWS endpoint. SST makes it easy to configure a custom domain for your API.

```ts title="stacks/Default.ts" {2}
new Api(stack, "api", {
  customDomain: "api.domain.com",
  routes: {
    "GET /": "packages/functions/src/hello.handler",
  },
});
```

You'll just need to ensure that the [domain is in Amazon Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/MigratingDNS.html).

---

## Authentication

You can use the [`Auth`](constructs/Auth.md) construct to attach a JWT powered authentication route to your API.

```ts title="stacks/Default.ts" {9}
import { Auth } from "sst/constructs";

const auth = new Auth(stack, "auth", {
  authenticator: {
    handler: "packages/functions/src/auth.handler",
  },
});

auth.attach(stack, { api });
```

Read more about this over on our [guide on authentication](auth.md).

---

## Customize your API

SST allows you to customize your API further by adding things like:

---

### CORS

[CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) allows web apps hosted on different domains (compared to the API) to make requests.

CORS is enabled by default for the `Api` construct to allow all HTTP methods with all HTTP headers from any origin. You can override this default behavior.

```ts title="stacks/Default.ts" {3-5}
new Api(stack, "api", {
  cors: {
    allowMethods: ["ANY"],
    allowHeaders: ["Authorization"],
    allowOrigins: ["https://www.example.com"],
  },
  routes: {
    "GET /": "packages/functions/src/hello.handler",
  },
});
```

---

### Access logs

Access logs are enabled by default for all SST APIs. The default log format is a JSON string. This can be customized.

```ts title="stacks/Default.ts" {3}
new Api(stack, "api", {
  // Write access log in CSV format
  accessLog:
    "$context.identity.sourceIp,$context.requestTime,$context.httpMethod,$context.routeKey,$context.protocol,$context.status,$context.responseLength,$context.requestId",
  routes: {
    "GET /": "packages/functions/src/hello.handler",
  },
});
```

---

### Catch-all routes

You can also add a catch-all route to catch requests that don't match any other routes.

```js title="stacks/Default.ts" {4}
new Api(stack, "api", {
  routes: {
    "GET /": "packages/functions/src/hello.handler",
    $default: "packages/functions/src/default.handler",
  },
});
```

---

## Other options

Aside from REST APIs, you can also add GraphQL and WebSocket APIs to your app.

---

### GraphQL

There are two main ways to add a GraphQL API in SST.

---

#### Pothos

You can use [Pothos](https://pothos-graphql.dev/), which is a code-first schema approach. Add a new route to your API, say `POST /graphql`.

```ts title="stacks/Default.ts" {3-11}
new Api(stack, "api", {
  routes: {
    "POST /graphql": {
      type: "graphql",
      function: "packages/functions/src/graphql.handler",
      pothos: {
        schema: "backend/functions/graphql/schema.ts",
        output: "graphql/schema.graphql",
        commands: ["./genql graphql/graphql.schema graphql/"],
      },
    },
  },
});
```

:::tip Tutorial
[Check out our tutorial](learn/index.md) on how to build an app with a GraphQL API.
:::

---

#### AppSync

The second involves using [AppSync](https://aws.amazon.com/appsync/) with the [`AppSyncApi`](constructs/AppSyncApi.md) construct.

```ts title="stacks/Default.ts"
import { AppSyncApi } from "sst/constructs";

new AppSyncApi(stack, "graphql", {
  schema: "graphql/schema.graphql",
  dataSources: {
    notesDS: "packages/functions/src/notes.handler",
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

:::tip Tutorial
[Check out our AppSync tutorial](https://sst.dev/examples/how-to-create-a-serverless-graphql-api-with-aws-appsync.html) to get started.
:::

---

### WebSocket

To add a WebSocket API to your app use the [`WebSocketApi`](constructs/WebSocketApi.md) construct. It uses [Amazon API Gateway WebSocket API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html) behind the scenes.

```ts title="stacks/Default.ts"
import { WebSocketApi } from "sst/constructs";

new WebSocketApi(stack, "ws", {
  routes: {
    $connect: "packages/functions/src/connect.handler",
    $default: "packages/functions/src/default.handler",
    $disconnect: "packages/functions/src/disconnect.handler",
    sendMessage: "packages/functions/src/sendMessage.handler",
  },
});
```

:::tip Tutorial
[Check out our WebSocket tutorial](https://sst.dev/examples/how-to-create-a-websocket-api-with-serverless.html) to get started.
:::

---

And that's it! You now know how to add a dedicated API to your app. Learn more about the concepts we've covered here.

- [`Api`](constructs/Api.md) construct
- [`AppSyncApi`](constructs/AppSyncApi.md) construct
- [`WebSocketApi`](constructs/WebSocketApi.md) construct
- [`Auth`](auth.md) — Add auth to your SST apps
