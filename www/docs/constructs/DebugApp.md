---
description: "Docs for the sst.DebugApp construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The DebugApp construct is used internally by SST to
- Deploy the [`DebugStack`](DebugStack.md). It contains the resources that powers [Live Lambda Development](/live-lambda-development.md).
- Automatically prefix the debug stack name with the stage and app name.

It extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html). It's made available as the `app` in the `debugApp()` callback in the `stacks/index.js` of your SST app.

```js
export function debugApp(app) {
  new sst.DebugStack(app, "debug-stack");
}
```

Since it is initialized internally, the props that are passed to `DebugApp` cannot be changed.


## Examples



### Access Properties
```js
export function debugApp(app) {
  app.name;
  app.stage;
  app.region;
  app.account;
}
```

## Properties
An instance of `DebugApp` has the following properties.
### account

_Type_ : <span class="mono">string</span>

The AWS account the app is being deployed to. This comes from the IAM credentials being used to run the SST CLI.

### name

_Type_ : <span class="mono">string</span>

The name of the app. This comes from the `name` in your `sst.json`.

### region

_Type_ : <span class="mono">string</span>

The region the app is being deployed to. If this is not specified as the [`--region`](/packages/cli.md#--region) option in the SST CLI, it'll default to the `region` in your `sst.json`.

### stage

_Type_ : <span class="mono">string</span>

The stage the app is being deployed to. If this is not specified as the [`--stage`](/packages/cli.md#--stage) option, it'll default to the stage configured during the initial run of the SST CLI.

## Methods
An instance of `DebugApp` has the following methods.
### logicalPrefixedName

```ts
logicalPrefixedName(logicalName)
```
_Parameters_
- __logicalName__ <span class="mono">string</span>


Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.

## DebugAppDeployProps
Deploy props for apps.

### name

_Type_ : <span class="mono">string</span>

The app name, used to prefix stacks.

### region

_Type_ : <span class="mono">string</span>

The region to deploy this app to.

### stage

_Type_ : <span class="mono">string</span>

The stage to deploy this app to.
