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

You can set some function props and have them apply to all the functions in the app.

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

You can also call `setDefaultFunctionProps` multiple times, and the props from each call will be merged. If a property is set more than once, the last value will be taken. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js title="lib/index.js"
export default function main(app) {
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 256,
    environment: { TABLE_NAME: "NOTES_TABLE" },
  });

  app.setDefaultFunctionProps({
    timeout: 20,
    environment: { BUCKET_NAME: "UPLAOD_BUCKET" },
  });

  // Add stacks
}
```

So in the above example, the functions by default will have a `timeout` of `20 seconds`, `memorySize` of `256MB`, and both the `TABLE_NAME` and the `BUCKET_NAME` environment variables set.

## Properties

The following properties are made available in addition to the properties of [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html#properties).

### name

_Type_ : `string`

The name of the app. This comes from the `name` in your `sst.json`.

### stage

_Type_ : `string`

The stage the app is being deployed to. If this is not specified as the `--stage` option in the CLI, it'll default to the `stage` in your `sst.json`.

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

The default function props to be applied to all the Lambda functions in the app. These default values will be overridden if a [`Function`](Function.md) sets its own props. Except for the `environment`, the `layers`, and the `permissions` properties, which will be merged.

Takes a [`FunctionProps`](Function.md#functionprops). Or a callback function takes [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Stack.html) that returns a [`FunctionProps`](Function.md#functionprops).

### logicalPrefixedName

```ts
logicalPrefixedName(logicalName: string): string
```

_Parameters_

- **logicalName** `string`

_Returns_

- `string`

Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.
