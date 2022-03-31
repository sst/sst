### Adding to an app

Add it to your app in `stacks/index.js`.

```js
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

Here `app` is an instance of [`App`](./App.md).

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

This invokes the `logicalPrefixedName` method in [`App`](./App.md) that your stack is added to. This'll return `dev-my-sst-app-MyResource`, where `dev` is the current stage and `my-sst-app` is the name of the app.

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
