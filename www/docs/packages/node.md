---
title: "@serverless-stack/node"
description: "Docs for the @serverless-stack/node package"
---

The (`@serverless-stack/node`) package provides helper libraries used inside the Lambda function code.

## Installation

```bash
# With npm
npm install @serverless-stack/node
# Or with Yarn
yarn add @serverless-stack/node
```

## Usage

### Config

The `Config` module helps with loading [secrets](../constructs/Secret.md) and [parameters](../constructs/Parameter.md) created in your SST app.

```ts
import { Config } from "@serverless-stack/node/config";

export const handler = async () => {
  console.log(Config.STRIPE_KEY);

  // ...
};
```

When you import `@serverless-stack/node/config`, it does two things:

- For Secrets, `Config` performs a top-level await to fetch and decrypt the secrets values from SSM ie. `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.
- For Parameters, `Config` reads the parameter values from Lambda environment variables, ie. `process.env.SST_PARAM_USER_UPDATED_TOPIC` and assigns to `Config.USER_UPDATED_TOPIC`.

Read more about how Config works in the chapter on [Environment variables](../config.md).

### Job

The `Job` module helps with creating and running [job](../constructs/Job.md) handler functions. You can [read more about it over on the job docs](../long-running-jobs.md).

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

### Handlers

Handlers are a collection of functions that wrap around Lambda function handlers.

:::caution
Handlers are being actively worked on and are subject to change.
:::

Each handler has a specific purpose but they share a couple of things in common:

1. Provide proper typesafety.
2. They also initialize SST's context system to power our [`Hooks`](#hooks).

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

#### `Handler`

A generic handler that takes the type of Lambda event and the underlying handler function.

This allows it to provide proper typesafety for the event object and the return object. It also starts up SST's context system allowing you to use our [`Hooks`](#hooks) in your application code.

```js
import { Handler } from "@serverless-stack/node/context";

export const getUsers = Handler("api", async (evt) => {});
```

##### Supported Events

Currently the generic `Handler` only supports API Gateway Lambda events.

- `api` - The ApiGateway v2 request event.

### Hooks

Hooks are functions that you can call anywhere in your application code and it'll have access to things that are specific to the current invocation. This avoids having to pass things through multiple function calls down to our domain code.

:::caution
Hooks are being actively worked on and are subject to change.
:::

For example, you can call the [`useSession`](#usesession) hook to get access to the current user session in APIs that need authentication.

Behind the scenes, Hooks are powered by a SST's context system. Handlers like the [`GraphQLHandler`](#graphqlhandler) and the generic [`Handler`](#handler) create a global variable that keeps track of the _"context"_ for the current request. This context object gets reset on every invocation.

Hooks are an alternative to middleware solutions like [Middy](https://middy.js.org). They provide better typesafety and will be familiar to developers that've used Hooks in frontend frameworks.

Currently there's only one hook that's exposed publicly.

##### `useSession`

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
