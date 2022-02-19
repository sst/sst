---
description: "Docs for the sst.DebugApp construct in the @serverless-stack/resources package"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The `DebugApp` construct extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html) and is used internally by SST to

- Deploy the [`DebugStack`](DebugStack) containing the resources to facilitate [Live Lambda Development](../live-lambda-development).
- Automatically prefix the debug stack name with the stage and app name

It is made available as the `app` in the `debugApp()` callback in the `stacks/index.js` of your SST app.

<MultiLanguageCode>
<TabItem value="js">

```js
export function debugApp(app) {
  new sst.DebugStack(app, "debug-stack");
}
```

</TabItem>
<TabItem value="ts">

```ts
export function debugApp(app: sst.DebugApp) {
  new sst.DebugStack(app, "debug-stack");
}
```

</TabItem>
</MultiLanguageCode>

Since it is initialized internally, the props that are passed to `App` cannot be changed.

## Examples

### Accessing app properties

The properties of the app can be accessed in the `stacks/index.js` as:

```js
app.name;
app.stage;
app.region;
app.account;
```

## Properties

The following properties are made available in addition to the properties of [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html#properties).

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

### logicalPrefixedName

```ts
logicalPrefixedName(logicalName: string): string
```

_Parameters_

- **logicalName** `string`

_Returns_

- `string`

Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.
