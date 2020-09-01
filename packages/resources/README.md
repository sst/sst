# @serverless-stack/resources [![npm](https://img.shields.io/npm/v/@serverless-stack/resources.svg)](https://www.npmjs.com/package/@serverless-stack/resources)

Part of the **[Serverless Stack Toolkit](https://github.com/serverless-stack/serverless-stack)**. Provides a couple of simple AWS CDK Constructs that allow you to:

- Automatically prefix stack names with the stage
- Optionally prefix resource names with the stage
- Deploy the entire app using the same AWS profile and region

## Usage

### Creating a new stack

Create a new stack by adding this in `lib/MyStack.js`.

```jsx
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Define your stack
  }
}
```

Here `sst.Stack` is a simple extension of `cdk.Stack` that prefixes the stack name with the stage and enforces using the global region and AWS profile.

### Adding to an app

Add it to your app in `lib/index.js`.

```jsx
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

Here `app` is an instance of `sst.App`. It's a simple extension of `cdk.App`.

Note that, setting the env for an individual stack is not allowed.

```jsx
new MyStack(app, "my-stack", { env: { account: "1234", region: "us-east-1" } });
```

It will throw this error.

```
Error: Do not directly set the environment for a stack
```

This is by design. The stacks in SST are meant to be re-deployed for multiple stages (like Serverless Framework). And so they depend on the region and AWS profile that's passed in through the CLI. If a stack is hardcoded to be deployed to a specific account or region, it can break your deployment pipeline.

### Prefixing resource names

You can optionally prefix resource names to make sure they don't thrash when deployed to different stages in the same AWS account.

You can do so in your stacks.

```jsx
this.node.root.logicalPrefixedName("MyResource");
```

This invokes the `logicalPrefixedName` method in `sst.App` that your stack is added to.

You can also get the stage name using.

```jsx
this.node.root.stage;
```

And the app name using.

```jsx
this.node.root.name;
```

Again these access the `sst.App` that your stacks are added to.
