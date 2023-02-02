import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The `DebugStack` construct is used internally to create the resources needed to power [Live Lambda Development](../live-lambda-development). Note that, the `DebugStack` construct should only be created inside the [`DebugApp`](DebugApp).

It extends [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html). It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensures that the stack uses the same AWS profile and region as the app.

## Examples

### Adding to an app

Add it to your app in `stacks/index.js`.

<MultiLanguageCode>
<TabItem value="js">

```js
import { DebugStack } from "@serverless-stack/resources";

export function debugApp(app) {
  new DebugStack(app, "debug-stack");

  // Customize debug stack
}
```

</TabItem>
<TabItem value="ts">

```ts
import { DebugApp, DebugStack } from "@serverless-stack/resources";

export function debugApp(app: DebugApp) {
  new DebugStack(app, "debug-stack");

  // Customize debug stack
}
```

</TabItem>
</MultiLanguageCode>

Here `app` is an instance of [`DebugApp`](DebugApp.md).

Note that, setting the `env` for the debug stack is not allowed.

```js
new MyStack(app, "my-stack", { env: { account: "1234", region: "us-east-1" } });
```

It will throw an error.

```
Error: Do not directly set the environment for a stack
```

This is by design. The stacks in SST are meant to be re-deployed to multiple stages. And so they depend on the region and AWS profile that's passed in through the CLI. If a stack is hardcoded to be deployed to a specific account or region, it can break your deployment pipeline.

### Accessing app properties

The stage, region, and app name can be accessed through the app object. In your `stacks/index.js` you can use.

<MultiLanguageCode>
<TabItem value="js">

```js
export function debugApp(app) {
  new DebugStack(app, "debug-stack");

  app.stage;
  app.region;
  app.name;
}
```

</TabItem>
<TabItem value="ts">

```ts
export function debugApp(app: DebugApp) {
  new DebugStack(app, "debug-stack");

  app.stage;
  app.region;
  app.name;
}
```

</TabItem>
</MultiLanguageCode>

You can use this to conditionally add stacks or resources to your app.

### Prefixing resource names

You can optionally prefix resource names to make sure they don't thrash when deployed to different stages in the same AWS account.

You can do so in your stacks.

```js
scope.logicalPrefixedName("MyResource"); // Returns "dev-my-sst-app-MyResource"
```

This invokes the [`logicalPrefixedName`](DebugApp.md#logicalprefixedname) method in `DebugApp` that the `DebugStack` is added to. This'll return `dev-my-sst-app-debug-stack`, where `dev` is the current stage and `my-sst-app` is the name of the app.

### Customizing stack name

```js
export function debugApp(app) {
  new DebugStack(app, "debug-stack", {
    stackName: app.logicalPrefixedName("my-debug-stack"),
  });
}
```

### Configuring the DynamoDB table

Configure the internally created CDK `Table` instance.

```js
export function debugApp(app) {
  new DebugStack(app, "debug-stack", {
    cdk: {
      table: {
        pointInTimeRecovery: true,
      }
    }
  });
}
```

### Using existing resources

```js
export function debugApp(app) {
  new DebugStack(app, "debug-stack", {
    payloadBucketArn: "arn:aws:s3:::my-bucket",
    websocketHandlerRoleArn: "arn:aws:iam::123456789012:role/my-role",
  });
}
```

### Tagging the debug stack

```js
import * as cdk from "aws-cdk-lib";

export function debugApp(app) {
  new sst.DebugStack(app, "debug-stack");
  cdk.Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);
}
```
