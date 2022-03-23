---
description: "Docs for the sst.App construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->


## Constructor
```ts
new App(deployProps: AppDeployProps, props: AppProps)
```
_Parameters_
- __deployProps__ [`AppDeployProps`](AppDeployProps)
- __props__ [`AppProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.AppProps.html)
## Properties
An instance of `App` has the following properties.
### account

_Type_ : `string`

The AWS account the app is being deployed to. This comes from the IAM credentials being used to run the SST CLI.

### defaultRemovalPolicy

_Type_ : `undefined`&nbsp; | &nbsp;`"destroy"`&nbsp; | &nbsp;`"retain"`&nbsp; | &nbsp;`"snapshot"`




### local

_Type_ : `boolean`

Whether or not the app is running locally under `sst start`

### name

_Type_ : `string`

The name of your app, comes from the `name` in your `sst.json`

### region

_Type_ : `string`

The region the app is being deployed to. If this is not specified as the --region option in the SST CLI, it'll default to the region in your sst.json.

### stage

_Type_ : `string`

The stage the app is being deployed to. If this is not specified as the --stage option, it'll default to the stage configured during the initial run of the SST CLI.

## Methods
An instance of `App` has the following methods.
### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(environment: Record)
```
_Parameters_
- __environment__ Record<`string`, `string`>


Adds additional default environment variables to be applied to all Lambda functions in the app.

#### Examples

```js
app.addDefaultFunctionPermissions({
  "MY_ENV_VAR": "my-value"
})
```

### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers: unknown)
```
_Parameters_
- __layers__ Array< [`ILayerVersion`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ILayerVersion.html) >


Adds additional default layers to be applied to all Lambda functions in the stack.

### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Adds additional default Permissions to be applied to all Lambda functions in the app.

#### Examples

```js
app.addDefaultFunctionPermissions(["s3"])
```

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: unknown)
```
_Parameters_
- __props__ [`FunctionProps`](Function)&nbsp; | &nbsp;[`Stack`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html) => [`FunctionProps`](Function)


The default function props to be applied to all the Lambda functions in the app. These default values will be overridden if a Function sets its own props.
This needs to be called before a stack with any functions have been added to the app.

#### Examples

```js
app.setDefaultFunctionProps({
  runtime: "nodejs12.x",
  timeout: 30
})
```

### setDefaultRemovalPolicy

```ts
setDefaultRemovalPolicy(policy: unknown)
```
_Parameters_
- __policy__ `"destroy"`&nbsp; | &nbsp;`"retain"`&nbsp; | &nbsp;`"snapshot"`


The default removal policy that'll be applied to all the resources in the app. This can be useful to set ephemeral (dev or feature branch) environments to remove all the resources on deletion.

#### Examples

```js
app.setDefaultRemovalPolicy(app.local ? "destroy" : "retain")
```
