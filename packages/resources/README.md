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


### Accessing app info

The stage, region, and app name can be accessed through the app object.

So in the `lib/index.js` you can access it using.

``` js
app.stage
app.region
app.name
```

And in your stack classes (for example, `lib/MyStack.js`) you can use.

``` js
this.node.root.stage
this.node.root.region
this.node.root.name
```

You can use this to conditionally add stacks or resources to your app.

### Prefixing resource names

You can optionally prefix resource names to make sure they don't thrash when deployed to different stages in the same AWS account.

You can do so in your stacks.

```jsx
this.node.root.logicalPrefixedName("MyResource")  // Returns "dev-my-sst-app-MyResource"
```

This invokes the `logicalPrefixedName` method in `sst.App` that your stack is added to. This'll return `dev-my-sst-app-MyResource`, where `dev` is the current stage and `my-sst-app` is the name of the app.
