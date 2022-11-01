# @serverless-stack/node [![npm](https://img.shields.io/npm/v/@serverless-stack/node.svg?style=flat-square)](https://www.npmjs.com/package/@serverless-stack/node)

The `@serverless-stack/node` package provides helper libraries used inside the Lambda function code.

[View the @serverless-stack/node docs here](https://docs.sst.dev/clients).

## Installation

```bash
# With npm
npm install @serverless-stack/node
# Or with Yarn
yarn add @serverless-stack/node
```

---

## Exports

The `@serverless-stack/node` package is made up of a collection of modules. Like the `@serverless-stack/node/api`, `@serverless-stack/node/bucket`, etc. Each of these modules has 3 types of exports:

---

### Properties

The properties in each module helps you access the resources that are bound to the function.

```ts
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

Due to the use of top-level await, your functions need to be bundled in the `esm` format.

---

### Handlers

The handlers in each module is a function that can wrap around Lambda function handlers.

```js
import { ApiHandler } from "@serverless-stack/node/api";

export const handler = ApiHandler((event) => {
  // ...
});
```

Each handler has a specific purpose but they share a couple of things in common:

1. Provide proper typesafety.
2. They also initialize SST's context system to power our [`Hooks`](#hooks).

---

### Hooks

The hooks in each module are functions that you can call anywhere in your application code. It has access to things that are specific to the current invocation. This avoids having to pass things through multiple function calls down to our domain code.

```ts
import { useSession } from "@serverless-stack/node/auth";

const session = useSession();

if (session.type === "user) {
  console.log(session.properties.userID);
}
```

Behind the scenes, Hooks are powered by a SST's context system.

---

### Others

Some of the modules also export types that can be used to define payloads for function calls. They also optionally export methods.

---

## Usage in tests

To access the [properties](#properties) in your tests, you'll need to wrap your tests with the `sst bind` CLI.

```bash
sst bind -- vitest run
```

This allows the `@serverless-stack/node` package to work as if it was running inside a Lambda function.
