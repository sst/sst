---
id: Stack
title: "Stack"
description: "Docs for the sst.Stack construct in the @serverless-stack/resources package"
---

The `Stack` construct extends [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Stack.html). It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensure that the stack uses the same AWS profile and region as the app.

## Initializer

```ts
new Stack(scope: Construct, id: string, props: StackProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`StackProps`](#stackprops)

## StackProps

Extends [`cdk.StackProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.StackProps.html).

## Examples

### Creating a new stack

Create a new stack by adding this in `lib/MyStack.js`.

```js
import { Stack } from "@serverless-stack/resources";

export default class MyStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Define your stack
  }
}
```

### Adding to an app

Add it to your app in `lib/index.js`.

```js
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

Here `app` is an instance of [`App`](constructs/App.md).

Note that, setting the env for an individual stack is not allowed.

```js
new MyStack(app, "my-stack", { env: { account: "1234", region: "us-east-1" } });
```

It will throw this error.

```
Error: Do not directly set the environment for a stack
```

This is by design. The stacks in SST are meant to be re-deployed for multiple stages (like Serverless Framework). And so they depend on the region and AWS profile that's passed in through the CLI. If a stack is hardcoded to be deployed to a specific account or region, it can break your deployment pipeline.

### Accessing app properties

The stage, region, and app name can be accessed through the app object. In your stacks (for example, `lib/MyStack.js`) you can use.

```js
this.node.root.name;
this.node.root.stage;
this.node.root.region;
```

You can use this to conditionally add stacks or resources to your app.

### Prefixing resource names

You can optionally prefix resource names to make sure they don't thrash when deployed to different stages in the same AWS account.

You can do so in your stacks.

```js
this.node.root.logicalPrefixedName("MyResource"); // Returns "dev-my-sst-app-MyResource"
```

This invokes the `logicalPrefixedName` method in [`App`](constructs/App.md) that your stack is added to. This'll return `dev-my-sst-app-MyResource`, where `dev` is the current stage and `my-sst-app` is the name of the app.

### Accessing AWS account info

To access the AWS account and region your app is being deployed to, use the following in your `Stack` instances.

```js
const { account, region } = Stack.of(this);
```
