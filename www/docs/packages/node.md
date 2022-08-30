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

Read more about how Config works in the chapter on [Environment variables](../environment-variables.md).

### Handlers

This packages provides various wrapper functions that can be used to define lambda function handlers. These wrappers provide proper typesafety and also boot up SST's context system that allows for request scoped state management as an alternative to middleware.


#### GraphQLHandler

The `GraphQLHandler` provides a lambda optimized GraphQL server that minimizes cold starts. It has a similar API to other alternatives like Apollo server so should be fairly simple to switch.

```js
import { GraphQLHandler } from "@serverless-stack/node/graphql"

export const handler = GraphQLHandler({
  schema,
})
```

##### Options
- `formatPayload` - Callback to intercept the the response and make any changes before sending response.
- `context` - Callback that runs at the beginning of the request to provide the context variable to GraphQL resolvers
- `schema` - The GraphQL schema that should be executed

#### AuthHandler

The `AuthHandler` provides a function that can be used to implement various authentication strategies, see [the full documentation](auth.md)

```js
import { AuthHandler } from "@serverless-stack/node/auth"

export const handler = AuthHandler({
  providers: {
    link: LinkAdapter(...)
  }
})
```

##### Options
- `providers` - an object listing the providers that have been configured.

#### Handler

This is a generic handler that can handle various kinds of events, generally you will not need to access this directly and instead use the higher level callbacks. The first argument specifies what kind of event and provides typesafety to the callback.

```js
import { Handler } from "@serverless-stack/node/context"

export const getUsers = Handler("api", async evt => {
})
```

##### Supported Events
- `api` - This is an ApiGateway v2 request

We will be adding more events over time.
