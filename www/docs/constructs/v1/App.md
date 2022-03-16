---
description: "Docs for the sst.App construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new App(deployProps: AppDeployProps, props: AppProps)
```
_Parameters_
- __deployProps__ [`AppDeployProps`](#appdeployprops)
- __props__ [`AppProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.AppProps.html)
## Properties
An instance of `App` has the following properties.
### account

_Type_ : `string`

### appPath

_Type_ : `string`

### buildDir

_Type_ : `string`

### debugBridge

_Type_ : `string`

### debugBucketArn

_Type_ : `string`

### debugBucketName

_Type_ : `string`

### debugEndpoint

_Type_ : `string`

### debugIncreaseTimeout

_Type_ : `boolean`

### debugStartedAt

_Type_ : `number`

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)&nbsp; | &nbsp;


### defaultRemovalPolicy

_Type_ : `undefined`&nbsp; | &nbsp;`"destroy"`&nbsp; | &nbsp;`"retain"`&nbsp; | &nbsp;`"snapshot"`

### esbuildConfig

_Type_ : `string`

### lint

_Type_ : `boolean`

### local

_Type_ : `boolean`

Is the app being deployed locally

### name

_Type_ : `string`

The app name

### region

_Type_ : `string`

### skipBuild

_Type_ : `boolean`

Skip building Function code
Note that on `sst remove`, we do not want to bundle the Lambda functions.
     CDK disables bundling (ie. zipping) for `cdk destroy` command.
     But SST runs `cdk synth` first then manually remove each stack. Hence
     we cannot rely on CDK to disable bundling, and we disable it manually.
     This allows us to disable BOTH building and bundling, where as CDK
     would only disable the latter. For example, `cdk destroy` still trys
     to install Python dependencies in Docker.

### stage

_Type_ : `string`

### typeCheck

_Type_ : `boolean`

## AppDeployProps
### buildDir

_Type_ : `string`

### debugBridge

_Type_ : `string`

### debugBucketArn

_Type_ : `string`

### debugBucketName

_Type_ : `string`

### debugEndpoint

_Type_ : `string`

### debugIncreaseTimeout

_Type_ : `boolean`

### debugStartedAt

_Type_ : `number`

### esbuildConfig

_Type_ : `string`

### lint

_Type_ : `boolean`

### name

_Type_ : `string`

The app name, used to prefix stacks.

- Defaults to empty string

### region

_Type_ : `string`

The region to deploy this app to.

- Defaults to us-east-1

### skipBuild

_Type_ : `boolean`

### stage

_Type_ : `string`

The stage to deploy this app to.

- Defaults to dev

### typeCheck

_Type_ : `boolean`
