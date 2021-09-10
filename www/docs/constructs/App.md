---
description: "Docs for the sst.App construct in the @serverless-stack/resources package"
---

The `App` construct extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html) and is used internally by SST to:

- Automatically prefix stack names with the stage and app name
- Deploy the entire app using the same AWS profile and region

It is made available as the `app` in the `lib/index.js` of your SST app.

```js
export default function main(app) {
  new MySampleStack(app, "sample");
}
```

Since it is initialized internally, the props that are passed to `App` cannot be changed.

## Examples

### Accessing app properties

The properties of the app can be accessed in the `lib/index.js` as:

```js
app.name;
app.stage;
app.region;
app.account;
```

### Specifying default function props

You can set some function props and have them apply to all the functions in the app. This must be called before any stacks have been added to the application so that all functions are created with these defaults.

```js title="lib/index.js"
export default function main(app) {
  app.setDefaultFunctionProps({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: { TABLE_NAME: "NOTES_TABLE" },
  });

  // Add stacks
}
```

Or if you need to access the `Stack` scope, you can pass in a callback.

```js title="lib/index.js"
import { StringParameter } from "@aws-cdk/aws-ssm";

export default function main(app) {
  app.setDefaultFunctionProps((stack) => ({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: {
      API_KEY: StringParameter.valueFromLookup(stack, "my_api_key"),
    },
  }));

  // Add stacks
}
```

You can also use `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` which can be called multiple times and from anywhere to progressively add more permissions and environment variables to the defaults. Note, only functions created after this call will contain the new values.

```js title="lib/index.js"
export default function main(app) {
  app.addDefaultFunctionEnv({
    TABLE_NAME: "NOTES_TABLE"
  });

  app.addDefaultFunctionPermissions(["s3"]);

  // Add stacks
}
```

So in the above example, the functions by default will have a `timeout` of `20 seconds`, `memorySize` of `256MB`, and both the `TABLE_NAME` and the `BUCKET_NAME` environment variables set.

### Setting a default removal policy

You can set a removal policy to apply to all the resources in the app. This is useful for ephemeral environments that need to clean up all their resources on removal.

``` js title="lib/index.js"
import { RemovalPolicy } from "@aws-cdk/core";

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
Prior to v0.42.0 there was a single `setDefaultFunctionProps` function that could be called from anywhere and overwrote some parameters and merged others. This created some confusion as it was not obvious which parameters were being merged.

In v0.42.0 `setDefaultFunctionProps` was updated so that it can only be called at the beginning of your app _before_ any Stacks have been added.

Additionally, the two following functions were added `addDefaultFunctionPermissions` and `addDefaultFunctionEnv`. These can be called from anywhere and be used to progressively add more permissions or environment variables to your defaults.

If you were previously calling `setDefaultFunctionProps` multiple times like so:
```ts
app.setDefaultFunctionProps({
  environment: {
    FOO: "bar"
  }
})

class MyStack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "MyStack")

    app.setDefaultFunctionProps({
      environment: {
        TABLE_NAME: "mytable"
      }
    })
  }
}

new MyStack(app)

```

Change it to
```ts
app.setDefaultFunctionProps({
  environment: {
    FOO: "bar"
  }
})

class MyStack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "MyStack")
    app.addDefaultFunctionEnv({ TABLE_NAME: "mytable" })
  }
}

new MyStack(app)
```

## Properties

The following properties are made available in addition to the properties of [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html#properties).

### name

_Type_ : `string`

The name of the app. This comes from the `name` in your `sst.json`.

### stage

_Type_ : `string`

The stage the app is being deployed to. If this is not specified as the `--stage` option in the CLI, it'll default to the stage configured during the initial run of the CLI.

### region

_Type_ : `string`

The region the app is being deployed to. If this is not specified as the `--region` option in the CLI, it'll default to the `region` in your `sst.json`.

### account

_Type_ : `string`

The AWS account the app is being deployed to. This comes from the IAM credentials being used to run SST.

## Methods

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps | ((stack: cdk.Stack) => FunctionProps))
```

_Parameters_

- **props** `FunctionProps | ((stack: cdk.Stack) => FunctionProps)`

The default function props to be applied to all the Lambda functions in the app. These default values will be overridden if a [`Function`](Function.md) sets its own props. This cannot be called after any stacks have been added to the app.

Takes a [`FunctionProps`](Function.md#functionprops). Or a callback function takes [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Stack.html) that returns a [`FunctionProps`](Function.md#functionprops).

### addDefaultFunctionEnv

```ts
addDefaultFunctionPermissions(env: Record<string, string>)
```

_Parameters_

- **env** `Record<string,string>`

Adds additional default environment variables to be applied to all Lambda functions in the app. Any Lambda functions created before this call will not include the variables


### addDefaultFunctionPermissions

```ts
addDefaultFunctionEnv(permissions: Permissions)
```

_Parameters_

- **permissions** `Permissions`

Adds additional default [`Permissions`](../util/Permissions.md) to be applied to all Lambda functions in the app. Any Lambda functions created before this call will not include the permissions. 


### setDefaultRemovalPolicy

```ts
setDefaultRemovalPolicy(policy: cdk.RemovalPolicy)
```

_Parameters_

- **props** [`cdk.RemovalPolicy`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.RemovalPolicy.html)

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
