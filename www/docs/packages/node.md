---
title: "@serverless-stack/node"
description: "Docs for the @serverless-stack/node package"
---

The `@serverless-stack/node` package provides helper libraries used inside the Lambda function code.

## Installation

```bash
# With npm
npm install @serverless-stack/node
# Or with Yarn
yarn add @serverless-stack/node
```

## Features

### Resource Binding

The `@serverless-stack/node` package helps you access resources bound to the function in a typesafe way.

For example, if you bind a [`Bucket`](../constructs/Bucket.md) to the function:
```ts
// Create an S3 bucket
const bucket = new Bucket(stack, "myFiles");

// Bind to function
new Function(stack, "myFunction", {
  handler: "lambda.handler",
  bind: [bucket],
});
```

You can access the bucket name by importing `Bucket` from `@serverless-stack/node/bucket`:
```ts
import { Bucket } from "@serverless-stack/node/bucket";

console.log(Bucket.myFiles.bucketName);
```

### Handlers

Handlers are a collection of functions that wrap around Lambda function handlers.

:::caution
Handlers are being actively worked on and are subject to change.
:::

Each handler has a specific purpose but they share a couple of things in common:

1. Provide proper typesafety.
2. They also initialize SST's context system to power our [`Hooks`](#hooks).

### Hooks

Hooks are functions that you can call anywhere in your application code and it'll have access to things that are specific to the current invocation. This avoids having to pass things through multiple function calls down to our domain code.

:::caution
Hooks are being actively worked on and are subject to change.
:::

For example, you can call the [`useSession`](#usesession) hook to get access to the current user session in APIs that need authentication.

Behind the scenes, Hooks are powered by a SST's context system. Handlers like the [`GraphQLHandler`](#graphqlhandler) and the generic [`Handler`](#handler) create a global variable that keeps track of the _"context"_ for the current request. This context object gets reset on every invocation.

Hooks are an alternative to middleware solutions like [Middy](https://middy.js.org). They provide better typesafety and will be familiar to developers that've used Hooks in frontend frameworks.

## Usage

### @serverless-stack/node/api

#### `Api`

This module helps with accessing [Apis](../constructs/Api.md).

```ts
import { Api } from "@serverless-stack/node/api";
console.log(Api.myApi.url);
```

#### `GraphQLApi`

This module helps with accessing [GraphqlApis](../constructs/GraphQLApi.md).

```ts
import { GraphQLApi } from "@serverless-stack/node/api";
console.log(GraphQLApi.myApi.url);
```

#### `WebSocketApi`

This module helps with accessing [WebSocketApis](../constructs/WebSocketApi.md).

```ts
import { WebSocketApi } from "@serverless-stack/node/api";
console.log(WebSocketApi.myApi.url);
```

#### `AppSyncApi`

This module helps with accessing [AppSyncApis](../constructs/AppSyncApi.md).

```ts
import { AppSyncApi } from "@serverless-stack/node/api";
console.log(AppSyncApi.myApi.url);
```

#### `ApiGatewayV1Api`

This module helps with accessing [ApiGatewayV1Apis](../constructs/ApiGatewayV1Api.md).

```ts
import { ApiGatewayV1Api } from "@serverless-stack/node/api";
console.log(ApiGatewayV1Api.myApi.url);
```

### @serverless-stack/node/auth

#### `AuthHandler`

The `AuthHandler` provides a function that can be used to implement various authentication strategies. You can [read more about it over on the auth docs](../auth.md).

```js
import { AuthHandler } from "@serverless-stack/node/auth";

export const handler = AuthHandler({
  providers: {
    link: LinkAdapter(...)
  }
});
```

##### Options

- `providers` - An object listing the providers that have been configured.

#### `useSession`

This hook returns the current session object.

```ts
const session = useSession();

console.log(session.properties.userId);
```

To define the session object you first create a type.

```ts
declare module "@serverless-stack/node/auth" {
  export interface SessionTypes {
    user: {
      userID: string;
    };
  }
}
```

The [`Session`](../auth.md#session) package can then be used to create an encrypted session token that'll be passed to the client. In subsequent requests the client will pass in this token, `authorization: Bearer <token>`.

The `useSession` hook will then decrypt and parse this token and return it with the previously defined type.

### @serverless-stack/node/bucket

#### `Bucket`

This module helps with accessing [Buckets](../constructs/Bucket.md).

```ts
import { Bucket } from "@serverless-stack/node/bucket";
console.log(Bucket.myBucket.bucketName);
```

### @serverless-stack/node/config

#### `Config`

This module helps with loading [Secrets](../constructs/Secret.md) and [Parameters](../constructs/Parameter.md) created in your SST app.

```ts
import { Config } from "@serverless-stack/node/config";
console.log(Config.STRIPE_KEY);
```

When you import `@serverless-stack/node/config`, it does two things:

- For Secrets, `Config` performs a top-level await to fetch and decrypt the secrets values from SSM ie. `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.
- For Parameters, `Config` reads the parameter values from Lambda environment variables, ie. `process.env.SST_Parameter_value_USER_UPDATED_TOPIC` and assigns to `Config.USER_UPDATED_TOPIC`.

Read more about how Config works in the chapter on [Config](../config.md).

### @serverless-stack/node/event-bus

#### `EventBus`

This module helps with accessing [Event Buseses](../constructs/EventBus.md).

```ts
import { EventBus } from "@serverless-stack/node/event-bus";
console.log(EventBus.myBus.eventBusName);
```

### @serverless-stack/node/function

#### `Function`

This module helps with accessing [Functions](../constructs/Function.md).

```ts
import { Function } from "@serverless-stack/node/function";
console.log(Function.myFunction.functionName);
```

### @serverless-stack/node/graphql

#### `GraphQLHandler`

A Lambda optimized GraphQL server that minimizes cold starts. It has a similar API to other alternatives like Apollo server so should be simple to switch.

```js
import { GraphQLHandler } from "@serverless-stack/node/graphql";

export const handler = GraphQLHandler({
  schema,
});
```

##### Options

- `formatPayload` - Callback to intercept the response and make any changes before sending response.
- `context` - Callback that runs at the beginning of the request to provide the context variable to GraphQL resolvers.
- `schema` - The GraphQL schema that should be executed.

### @serverless-stack/node/job

This module helps with creating and running [Jobs](../constructs/Job.md) handler functions. You can [read more about it over on the job docs](../long-running-jobs.md).

#### `JobTypes`

A type interface you can extend to define the job payload types.

```ts
declare module "@serverless-stack/node/job" {
  export interface JobTypes {
    MyJob: {
      num: number;
    };
  }
}
```

#### `JobHandler`

The `JobHandler` provides a function that can be used to implement the job handler function.

```js
import { JobHandler } from "@serverless-stack/node/job";

export const handler = JobHandler("MyJob", async (payload) => {});
```

#### `Job.run`

`Job.run` provides a function that can be used to invoke the job handler function.

```ts
await Job.run("MyJob", {
  payload: {
    num: 100,
  },
});
```

##### Options

- `payload` - Payload object to invoke the job with.

### @serverless-stack/node/kinesis-stream

#### `KinesisStream`

This module helps with accessing [Kinesis Streams](../constructs/KinesisStream.md).

```ts
import { KinesisStream } from "@serverless-stack/node/kinesis-stream";
console.log(KinesisStream.myStream.streamName);
```

### @serverless-stack/node/queue

#### `Queue`

This module helps with accessing [Queues](../constructs/Queue.md).

```ts
import { Queue } from "@serverless-stack/node/queue";
console.log(Queue.myQueue.queueUrl);
```

### @serverless-stack/node/rds

#### `RDS`

This module helps with accessing [RDS clusters](../constructs/RDS.md).

```ts
import { RDS } from "@serverless-stack/node/rds";
console.log(RDS.myDatabase.clusterArn);
console.log(RDS.myDatabase.secretArn);
console.log(RDS.myDatabase.defaultDatabaseName);
```

### @serverless-stack/node/site

#### `StaticSite`

This module helps with accessing [StaticSites](../constructs/StaticSite.md).

```ts
import { StaticSite } from "@serverless-stack/node/static-site";
console.log(StaticSite.myWeb.url);
```

#### `ViteStaticSite`

This module helps with accessing [ViteStaticSites](../constructs/ViteStaticSite.md).

```ts
import { ViteStaticSite } from "@serverless-stack/node/static-site";
console.log(ViteStaticSite.myWeb.url);
```

#### `ReactStaticSite`

This module helps with accessing [ReactStaticSites](../constructs/ReactStaticSite.md).

```ts
import { ReactStaticSite } from "@serverless-stack/node/static-site";
console.log(ReactStaticSite.myWeb.url);
```

#### `NextjsSite`

This module helps with accessing [NextjsSites](../constructs/NextjsSite.md).

```ts
import { NextjsSite } from "@serverless-stack/node/static-site";
console.log(NextjsSite.myWeb.url);
```

#### `RemixSite`

This module helps with accessing [RemixSites](../constructs/RemixSite.md).

```ts
import { RemixSite } from "@serverless-stack/node/static-site";
console.log(RemixSite.myWeb.url);
```

### @serverless-stack/node/table

#### `Table`

This module helps with accessing [Tables](../constructs/Table.md).

```ts
import { Table } from "@serverless-stack/node/table";
console.log(Table.myTable.tableName);
```

### @serverless-stack/node/topic

#### `Topic`

This module helps with accessing [Topics](../constructs/Topic.md).

```ts
import { Topic } from "@serverless-stack/node/topic";
console.log(Topic.myTopic.topicName);
```