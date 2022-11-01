# @serverless-stack/node [![npm](https://img.shields.io/npm/v/@serverless-stack/node.svg?style=flat-square)](https://www.npmjs.com/package/@serverless-stack/node)

The `@serverless-stack/node` package provides helper libraries used inside the Lambda function code.

[View the @serverless-stack/node docs here](https://docs.sst.dev/packages/clients).

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

For example, if you bind a [`Bucket`](https://docs.sst.dev/constructs/Bucket.md) to the function:

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

:::note
Due to the use of top-level await, your functions need to be bundled in the `esm` format. If you created your app using [`create-sst`](https://docs.sst.dev/packages/create-sst.md), the bundle format is likely already set to `esm`. [Here's how to set the Function bundle format](https://docs.sst.dev/constructs/Function.md#format).
:::

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

For example, you can call the [`useSession`](https://docs.sst.dev/clients/auth.md#usesession) hook to get access to the current user session in APIs that need authentication.

Behind the scenes, Hooks are powered by a SST's context system. Handlers like the [`GraphQLHandler`](https://docs.sst.dev/clients/graphql.md#graphqlhandler) and the [`AuthHandler`](https://docs.sst.dev/clients/auth.md#authhandler) create a global variable that keeps track of the _"context"_ for the current request. This context object gets reset on every invocation.

Hooks are an alternative to middleware solutions like [Middy](https://middy.js.org). They provide better typesafety and will be familiar to developers that've used Hooks in frontend frameworks.
