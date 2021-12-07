---
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

## Examples

### Creating a new stack

Create a new stack by adding this in `stacks/MyStack.js`.

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

Add it to your app in `stacks/index.js`.

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

The stage, region, and app name can be accessed through the app object. In your stacks (for example, `stacks/MyStack.js`) you can use.

```js
class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    scope.stage;
    scope.region;
    scope.name;
  }
}
```

And in TypeScript.

```ts
class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    scope.stage;
    scope.region;
    scope.name;
  }
}
```

You can use this to conditionally add stacks or resources to your app.

### Specifying default function props

You can set some function props and have them apply to all the functions in a stack. This **must be called before** any functions have been added to the stack; so that all functions will be created with these defaults.

```js
class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.setDefaultFunctionProps({
      timeout: 20,
      memorySize: 512,
      runtime: "go1.x",
      environment: { TABLE_NAME: "NOTES_TABLE" },
    });

    // Start adding resources
  }
}
```

It'll also override any props set by the [App's `setDefaultFunctionProps`](App.md#setdefaultfunctionprops), while merging the `environment` and `permission` props.

### Updating default function props

You can also use [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions), [`addDefaultFunctionEnv`](#adddefaultfunctionenv), and [`addDefaultFunctionLayers`](#adddefaultfunctionlayers) to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

However, they only affect the functions that are created after the call.

```js
class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new Api(this, "Api1", {
      routes: {
        "GET /": "src/hello.main",
      },
    });

    this.addDefaultFunctionEnv({
      TABLE_NAME: "NOTES_TABLE"
    });

    this.addDefaultFunctionPermissions(["s3"]);

    this.addDefaultFunctionLayers([mylayer]);

    new Api(this, "Api2", {
      routes: {
        "GET /": "src/world.main",
      },
    });

    // Add more resources
  }
}
```

So in the above example, the `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` calls will only impact the functions in `Api2`.

### Prefixing resource names

You can optionally prefix resource names to make sure they don't thrash when deployed to different stages in the same AWS account.

You can do so in your stacks.

```js
scope.logicalPrefixedName("MyResource"); // Returns "dev-my-sst-app-MyResource"
```

This invokes the `logicalPrefixedName` method in [`App`](constructs/App.md) that your stack is added to. This'll return `dev-my-sst-app-MyResource`, where `dev` is the current stage and `my-sst-app` is the name of the app.

### Adding stack outputs

```js {8-11}
export default class MyStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const topic = new Topic(this, "Topic");
    const queue = new Queue(this, "Queue");

    this.addOutputs({
      TopicArn: topic.snsTopic.topicArn,
      QueueArn: topic.sqsQueue.queueArn,
    });
  }
}
```

### Adding stack exports

```js {7-9}
export default class MyStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const topic = new Topic(this, "Topic");

    this.addOutputs({
      TopicArn: { value: topic.snsTopic.topicArn, exportName: "MyTopicArn" },
    });
  }
}
```

### Accessing AWS account info

To access the AWS account and region your app is being deployed to, use the following in your `Stack` instances.

```js
this.region;
this.account;
```

The region here is the same as the one you can find in the `scope` instance in the constructor.

### Setting Permission Boundary

To set permission boundary on all IAM users and roles created in your `Stack` instances.

```js
import * as iam from '@aws-cdk/aws-iam';

class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const boundary = new iam.ManagedPolicy(this, "Boundary", {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["iam:*"],
          resources: ["*"],
        }),
      ],
    });

    iam.PermissionsBoundary.of(this).apply(boundary);
  }
}
```

## Methods

An instance of `Stack` contains the following methods.

### getAllFunctions

```ts
getAllFunctions(): Function
```

_Returns_

- [`Function[]`](Function.md)

Returns all the [`Function`](Function.md) instances in this stack.

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps)
```

_Parameters_

- **props** `FunctionProps`

The default function props to be applied to all the Lambda functions in the stack. These default values will be overridden if a [`Function`](Function.md) sets its own props. This cannot be called after any functions have been added to the stack.

:::note
The `setDefaultFunctionProps` function must be called before any functions have been added.
:::

Takes the [`FunctionProps`](Function.md#functionprops).

This overrides the props from the [App's `setDefaultFunctionProps`](App.md#setdefaultfunctionprops), while merging the `permissions` and `environment` props.

### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(env: { [key: string]: string })
```

_Parameters_

- **env** `{ [key: string]: string }`

Adds additional default environment variables to be applied to all Lambda functions in the stack.

:::note
Only functions created after a `addDefaultFunctionEnv` call will contain the new values.
:::

### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** `Permissions`

Adds additional default [`Permissions`](../util/Permissions.md) to be applied to all Lambda functions in the stack.

:::note
Only functions created after a `addDefaultFunctionPermissions` call will contain the new values.
:::

### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers: lambda.ILayerVersion[])
```

_Parameters_

- **layers** [`lambda.ILayerVersion[]`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.ILayerVersion.html)

Adds additional default layers to be applied to all Lambda functions in the stack.

:::note
Only functions created after a `addDefaultFunctionLayers` call will contain the new values.
:::

### addOutputs

```ts
addOutputs(outputs: { [key: string]: string | cdk.CfnOutputProps })
```

_Parameters_

- **outputs** `{ [key: string]: string | cdk.CfnOutputProps }`

An associative array with the key being the output name as a string and the value is either a `string` as the output value or the [`cdk.CfnOutputProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.CfnOutputProps.html).

## StackProps

Extends [`cdk.StackProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.StackProps.html).
