<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
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

The region the app is being deployed to. If this is not specified as the `--region` option in the SST CLI, it'll default to the `region` in your `sst.json`.

### stage

_Type_ : <span class="mono">string</span>

The stage the app is being deployed to. If this is not specified as the `--stage` option, it'll default to the stage configured during the initial run of the SST CLI.

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
