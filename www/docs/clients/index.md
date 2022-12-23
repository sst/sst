---
title: "Clients"
sidebar_label: Overview
description: "Helper packages for your Node.js Lambda functions."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Helper packages for your Node.js Lambda functions.

</HeadlineText>

---

## Installation

Install the [`@serverless-stack/node`](https://www.npmjs.com/package/@serverless-stack/node) package in your `services/` directory.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm install @serverless-stack/node
```

</TabItem>

<TabItem value="yarn">

```bash
yarn add @serverless-stack/node
```

</TabItem>
</MultiPackagerCode>

Or the directory where your functions are placed.

---

## Exports

The `@serverless-stack/node` package is made up of a collection of modules. Like the `@serverless-stack/node/api`, `@serverless-stack/node/bucket`, etc. Each of these modules has 3 types of exports:

---

### Properties

The properties in each module helps you access the resources that are bound to the function.

For example, if you [bind](../resource-binding.md) a [`Bucket`](../constructs/Bucket.md) to the function:

```ts {7}
// Create an S3 bucket
const bucket = new Bucket(stack, "myFiles");

new Function(stack, "myFunction", {
  handler: "lambda.handler",
  // Bind to function
  bind: [bucket],
});
```

You can access the bucket name in your function by importing `Bucket` from the `@serverless-stack/node/bucket` module:

```ts
import { Bucket } from "@serverless-stack/node/bucket";

console.log(Bucket.myFiles.bucketName);
```

:::info
Due to the use of top-level await, your functions need to be bundled in the `esm` format. If you created your app using [`create-sst`](packages/create-sst.md), the bundle format is likely already set to `esm`. [Here's how to set the Function bundle format](constructs/Function.md#format).
:::

---

### Handlers

The handlers in each module is a function that can wrap around Lambda function handlers. Here's an example of the [API handler](api.md#apihandler).

```js
import { ApiHandler } from "@serverless-stack/node/api";

export const handler = ApiHandler((event) => {
  // ...
});
```

:::caution
Handlers are being actively worked on and are subject to change.
:::

Each handler has a specific purpose but they share a couple of things in common:

1. Provide proper typesafety.
2. They also initialize SST's context system to power our [`Hooks`](#hooks).

---

### Hooks

The hooks in each module are functions that you can call anywhere in your application code. It has access to things that are specific to the current invocation. This avoids having to pass things through multiple function calls down to our domain code.

:::caution
Hooks are being actively worked on and are subject to change.
:::

For example, you can call the [`useSession`](auth.md#usesession) hook to get access to the current user session in APIs that need authentication.

```ts
import { useSession } from "@serverless-stack/node/auth";

const session = useSession();

if (session.type === "user) {
  console.log(session.properties.userID);
}
```

Behind the scenes, Hooks are powered by a SST's context system. Handlers like the [`GraphQLHandler`](graphql.md#graphqlhandler) and the [`AuthHandler`](auth.md#authhandler) create a global variable that keeps track of the _"context"_ for the current request. This context object gets reset on every invocation.

Hooks are an alternative to middleware solutions like [Middy](https://middy.js.org). They provide better typesafety and will be familiar to developers that've used Hooks in frontend frameworks.

---

### Others

Some of the modules also export types that can be used to define payloads for function calls. For example, the [`job`](job.md) exports [`JobTypes`](job.md#jobtypes).

The [`job`](job.md) also exports a [method](job.md#run) to run a job.

---

## Language support

Currently the client only supports JavaScript and TypeScript. But if you are looking to add support for other languages, <a href={ config.discord }>message us in Discord</a> and we can help you get started.

---

## Usage in tests

To access the [properties](#properties) in your tests, you'll need to wrap your tests with the [`sst bind`](packages/sst.md#bind) CLI.

```bash
sst bind -- vitest run
```

This allows the `@serverless-stack/node` package to work as if it was running inside a Lambda function.

[Read more about testing](../testing.md) and [learn about the `sst bind` CLI](../testing.md#how-sst-bind-works).
