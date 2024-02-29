The Stack construct extends cdk.Stack. It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensure that the stack uses the same AWS profile and region as the app. They're defined using functions that return resources that can be imported by other stacks.

## Examples

### Creating a new stack

```js
import { StackContext } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  // Define your stack
}
```

### Adding to an app

Add it to your app in `sst.config.ts`.

```ts
stacks(app) {
  app.stack(StackA).stack(StackB);

  // Add more stacks
}
```

Here `app` is an instance of [`App`](./App.md).

Note that, setting the env for an individual stack is not allowed.

```js
app.stack(MyStack, { env: { account: "1234", region: "us-east-1" } });
```

It will throw this error.

```
Error: Do not directly set the environment for a stack
```

This is by design. The stacks in SST are meant to be re-deployed for multiple stages (like Serverless Framework). And so they depend on the region and AWS profile that's passed in through the CLI. If a stack is hardcoded to be deployed to a specific account or region, it can break your deployment pipeline.

### Configuring stack name

By default, the name of the CloudFormation stack is the stage name, app name, and the stack function name joined by `-`, ie. `stage-app-MyStack`.

You can override the stack function name by passing in `id`. In this case, the CloudFormation stack name is `stage-app-my-stack`.

```ts title="sst.config.ts"
stacks(app) {
  app.stack(MyStack, { id: "my-stack" });
}
```

Alternatively, you can override the CloudFormation stack name directly by passing in `stackName`.

```ts title="sst.config.ts"
stacks(app) {
  app.stack(MyStack, { stackName: `${app.stage}-my-hello-stack` });
}
```

Note that, `stackName` need to be parameterized with the stage name. This ensure an app can be deployed to multiple stages with unique stack names.

### Sharing resources between stacks

Resources defined in a stack can be used by other stacks. This allows you to have granular stacks that contain only related resources.

Stack functions can return any resources they want to expose to other stacks.

```ts
import { StackContext } from "sst/constructs";

export function MyStack({ stack }: StackContext) {
  const table = new Table(stack, "table");
  return {
    table,
  };
}
```

Other stacks can import these resources by utilizing the `use` function

```ts
import { StackContext, use } from "sst/constructs";
import { MyStack } from "./MyStack";

export function AnotherStack({ stack }: StackContext) {
  const { table } = use(MyStack);
  // Use table
}
```

### Async stacks

Asynchronous calls are supported in stack functions but be careful when using this as you can introduce external state that makes your deployments less deterministic

Simple add an `async` modifier to your function definition

```ts
import { StackContext } from "sst/constructs";

export async function MyStack({ stack }: StackContext) {
  const foo = await someAsyncCall();
  // Define stack
}
```

When initializing the stack, make sure you call `await`

```ts title="sst.config.ts"
async stacks(app) {
  await app.stack(MyStack);
}
```

### Accessing app properties

The stage, region, and app name can be accessed through the app object. In your stacks (for example, `stacks/MyStack.js`) you can use.

```ts
function MyStack({ stack, app }: StackContext) {
  app.stage;
  app.region;
  app.name;
}
```

You can use this to conditionally add stacks or resources to your app.

### Specifying default function props

You can set some function props and have them apply to all the functions in a stack. This **must be called before** any functions have been added to the stack; so that all functions will be created with these defaults.

```ts
function MyStack({ stack }: StackContext) {
  stack.setDefaultFunctionProps({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: { TABLE_NAME: "NOTES_TABLE" },
  });
}
```

It'll also override any props set by the [App's `setDefaultFunctionProps`](App.md#setdefaultfunctionprops), while merging the `environment` and `permission` props.

### Updating default function props

You can also use [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions), [`addDefaultFunctionEnv`](#adddefaultfunctionenv), and [`addDefaultFunctionLayers`](#adddefaultfunctionlayers) to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

However, they only affect the functions that are created after the call.

```ts
function MyStack({ stack }: StackContext) {
  new Api(stack, "Api1", {
    routes: {
      "GET /": "src/hello.main",
    },
  });

  stack.addDefaultFunctionEnv({
    TABLE_NAME: "NOTES_TABLE",
  });

  stack.addDefaultFunctionPermissions(["s3"]);

  stack.addDefaultFunctionLayers([mylayer]);

  new Api(stack, "Api2", {
    routes: {
      "GET /": "src/world.main",
    },
  });
}
```

So in the above example, the `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` calls will only impact the functions in `Api2`.

### Prefixing resource names

You can optionally prefix resource names to make sure they don't thrash when deployed to different stages in the same AWS account.

You can do so in your stacks.

```ts
scope.logicalPrefixedName("MyResource"); // Returns "dev-my-sst-app-MyResource"
```

This invokes the `logicalPrefixedName` method in [`App`](./App.md) that your stack is added to. This'll return `dev-my-sst-app-MyResource`, where `dev` is the current stage and `my-sst-app` is the name of the app.

### Adding stack outputs

```ts
export function MyStack({ stack }: StackContext) {
  const topic = new Topic(stack, "Topic");
  const queue = new Queue(stack, "Queue");
  stack.addOutputs({
    TopicArn: topic.snsTopic.topicArn,
    QueueArn: topic.sqsQueue.queueArn,
  });
}
```

### Adding stack exports

```ts
export function MyStack({ stack }: StackContext) {
  const topic = new Topic(stack, "Topic");

  stack.addOutputs({
    TopicArn: {
      value: topic.snsTopic.topicArn,
      exportName: "MyTopicArn",
    },
  });
}
```

### Accessing AWS account info

To access the AWS account and region your app is being deployed to, use the following in your `Stack` instances.

```js
stack.region;
stack.account;
```

The region here is the same as the one you can find in the `app` instance in the constructor.
