---
description: "Docs for the sst.App construct in the @serverless-stack/resources package"
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The `App` construct extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html) and is used internally by SST to:

- Automatically prefix stack names with the stage and app name
- Deploy the entire app using the same AWS profile and region

It is made available as the `app` in the `stacks/index.js` of your SST app.

```js
export default function main(app) {
  new MySampleStack(app, "sample");
}
```

Since it is initialized internally, the props that are passed to `App` cannot be changed.

## Examples

### Accessing app properties

The properties of the app can be accessed in the `stacks/index.js` as:

```js
export default function main(app) {
  app.name;
  app.stage;
  app.region;
  app.account;
}
```

### Specifying default function props

You can set some function props and have them apply to all the functions in your app. This must be called before any stack with functions have been added to the application; so that all functions will be created with these defaults.

```js title="stacks/index.js"
export default function main(app) {
  app.setDefaultFunctionProps({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: { TABLE_NAME: "NOTES_TABLE" },
  });

  // Start adding stacks
}
```

Or if you need to access the `Stack` scope, you can pass in a callback.

```js title="stacks/index.js"
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export default function main(app) {
  app.setDefaultFunctionProps((stack) => ({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: {
      API_KEY: StringParameter.valueFromLookup(stack, "my_api_key"),
    },
  }));

  // Start adding stacks
}
```

### Updating default function props

You can also use [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions), [`addDefaultFunctionEnv`](#adddefaultfunctionenv), and [`addDefaultFunctionLayers`](#adddefaultfunctionlayers) to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

However, they only affect the functions that are created after the call.

```js title="stacks/index.js"
export default function main(app) {
  new StackA(app, "stack-a");

  app.addDefaultFunctionEnv({
    TABLE_NAME: "NOTES_TABLE",
  });

  app.addDefaultFunctionPermissions(["s3"]);

  app.addDefaultFunctionLayers([mylayer]);

  new StackB(app, "stack-b");

  // Add more stacks
}
```

So in the above example, the `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` calls will only impact the functions in `StackB`.

You can also use the [Stack's `setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) to update these for a specific stack.

### Setting a default removal policy

You can set a removal policy to apply to all the resources in the app. This is useful for ephemeral environments that need to clean up all their resources on removal.

```js title="stacks/index.js"
import { RemovalPolicy } from "aws-cdk-lib";

export default function main(app) {
  // Remove all resources when the dev stage is removed
  if (app.stage === "dev") {
    app.setDefaultRemovalPolicy(RemovalPolicy.DESTROY);
  }

  // Add stacks
}
```

Note that, the [`setDefaultRemovalPolicy`](#setdefaultremovalpolicy) method isn't meant to be used for production environments.

### Upgrading to v0.42.0

Prior to [v0.42.0](https://github.com/sst/sst/releases/tag/v0.42.0), there was a single `setDefaultFunctionProps` function that could be called from anywhere and overwrote some parameters and merged others. This created some confusion as it was not obvious which parameters were being merged.

In v0.42.0, `setDefaultFunctionProps` was updated so it can only be called at the beginning of your app, _before_ any stack with functions have been added. It'll throw an error if it's called after adding them.

Additionally, the two following functions were added; [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions) and [`addDefaultFunctionEnv`](#adddefaultfunctionenv). These can be called from anywhere and be used to progressively add more permissions or environment variables to your defaults.

If you were previously calling `setDefaultFunctionProps` multiple times like so:

<MultiLanguageCode>
<TabItem value="js">

```js
app.setDefaultFunctionProps({
  environment: { FOO: "bar" },
});

class MyStack extends sst.Stack {
  constructor(scope) {
    super(scope, "MyStack");

    app.setDefaultFunctionProps({
      environment: { TABLE_NAME: "mytable" },
    });
  }
}

new MyStack(app);
```

</TabItem>
<TabItem value="ts">

```ts
app.setDefaultFunctionProps({
  environment: { FOO: "bar" },
});

class MyStack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "MyStack");

    app.setDefaultFunctionProps({
      environment: { TABLE_NAME: "mytable" },
    });
  }
}

new MyStack(app);
```

</TabItem>
</MultiLanguageCode>

Change it to:

<MultiLanguageCode>
<TabItem value="js">

```js
app.setDefaultFunctionProps({
  environment: { FOO: "bar" },
});

class MyStack extends sst.Stack {
  constructor(scope) {
    super(scope, "MyStack");

    app.addDefaultFunctionEnv({ TABLE_NAME: "mytable" });
  }
}

new MyStack(app);
```

</TabItem>
<TabItem value="ts">

```ts
app.setDefaultFunctionProps({
  environment: { FOO: "bar" },
});

class MyStack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "MyStack");

    app.addDefaultFunctionEnv({ TABLE_NAME: "mytable" });
  }
}

new MyStack(app);
```

</TabItem>
</MultiLanguageCode>

You can also use the [Stack's `setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) to update these for a specific stack.

## Properties

The following properties are made available in addition to the properties of [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html#properties).

### name

_Type_ : `string`

The name of the app. This comes from the `name` in your `sst.json`.

### stage

_Type_ : `string`

The stage the app is being deployed to. If this is not specified as the [`--stage`](../../packages/sst.md#--stage) option, it'll default to the stage configured during the initial run of the SST CLI.

### region

_Type_ : `string`

The region the app is being deployed to. If this is not specified as the [`--region`](../../packages/sst.md#--region) option in the SST CLI, it'll default to the `region` in your `sst.json`.

### account

_Type_ : `string`

The AWS account the app is being deployed to. This comes from the IAM credentials being used to run the SST CLI.

## Methods

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps | ((stack: cdk.Stack) => FunctionProps))
```

_Parameters_

- **props** `FunctionProps | ((stack: cdk.Stack) => FunctionProps)`

The default function props to be applied to all the Lambda functions in the app. These default values will be overridden if a [`Function`](Function.md) sets its own props.

Also, this needs to be called before a stack with any functions have been added to the app.

:::note
The `setDefaultFunctionProps` function must be called before a stack with any functions have been added.
:::

Takes [`FunctionProps`](Function.md#functionprops). Or a callback function takes [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html) and returns [`FunctionProps`](Function.md#functionprops).

Note that, you can also set function properties using the Stack's [`setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) and at the Function level. Those properties will override the defaultFunctionProps except for `environment`, `layers`, and `permissions` properties. These will be merged instead.

### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(env: { [key: string]: string })
```

_Parameters_

- **env** `{ [key: string]: string }`

Adds additional default environment variables to be applied to all Lambda functions in the app.

:::note
Only functions created after a `addDefaultFunctionEnv` call will contain the new values.
:::

### addDefaultFunctionPermissions

```ts
addDefaultFunctionEnv(permissions: Permissions)
```

_Parameters_

- **permissions** `Permissions`

Adds additional default [`Permissions`](./Permissions) to be applied to all Lambda functions in the app.

:::note
Only functions created after a `addDefaultFunctionPermissions` call will contain the new values.
:::

### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers: lambda.ILayerVersion[])
```

_Parameters_

- **layers** [`lambda.ILayerVersion[]`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.ILayerVersion.html)

Adds additional default layers to be applied to all Lambda functions in the stack.

:::note
Only functions created after a `addDefaultFunctionLayers` call will contain the new values.
:::

### setDefaultRemovalPolicy

```ts
setDefaultRemovalPolicy(policy: cdk.RemovalPolicy)
```

_Parameters_

- **props** [`cdk.RemovalPolicy`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RemovalPolicy.html)

The default removal policy that'll be applied to all the resources in the app. This can be useful to set ephemeral (dev or feature branch) environments to remove all the resources on deletion.

:::danger
Make sure to not set the default removal policy to `DESTROY` for production environments.
:::

### logicalPrefixedName

```ts
logicalPrefixedName(logicalName: string): string
```

_Parameters_

- **logicalName** `string`

_Returns_

- `string`

Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.
