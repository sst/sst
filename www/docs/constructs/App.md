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
The App construct extends cdk.App and is used internally by SST to:
- Automatically prefix stack names with the stage and app name
- Deploy the entire app using the same AWS profile and region

It is made available as the `app` in the `stacks/index.js` of your SST app.

```js
export default function main(app) {
  new MySampleStack(app, "sample");
}
```

Since it is initialized internally, the props that are passed to App cannot be changed.


## Examples



import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

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

You can also use [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions), [`addDefaultFunctionEnv`](#adddefaultfunctionenv), and [`addDefaultFunctionLayers`](#adddefaultfunctionlayers) to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

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

You can also use `addDefaultFunctionPermissions`, `addDefaultFunctionEnv`, and `addDefaultFunctionLayers` to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

However, they only affect the functions that are created after the call.

```js title="stacks/index.js"
export default function main(app) {
  app.stack(StackA)

  app.addDefaultFunctionEnv({
    TABLE_NAME: "NOTES_TABLE"
  });

  app.addDefaultFunctionPermissions(["s3"]);

  app.addDefaultFunctionLayers([mylayer]);

  app.stack(StackB)

  // Add more stacks
}
```

So in the above example, the `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` calls will only impact the functions in `StackB`.

You can also use the [Stack's `setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) to update these for a specific stack.

### Setting a default removal policy

You can set a removal policy to apply to all the resources in the app. This is useful for ephemeral environments that need to clean up all their resources on removal.

``` js title="stacks/index.js"
export default function main(app) {
  // Remove all resources when the dev stage is removed
  if (app.stage === "dev") {
    app.setDefaultRemovalPolicy("destroy");
  }

  // Add stacks
}
```

Note that, the [`setDefaultRemovalPolicy`](#setdefaultremovalpolicy) method isn't meant to be used for production environments.

## Properties
An instance of `App` has the following properties.
### account

_Type_ : <span class="mono">string</span>

The AWS account the app is being deployed to. This comes from the IAM credentials being used to run the SST CLI.

### defaultRemovalPolicy

_Type_ : <span class='mono'><span class="mono">undefined</span> | <span class="mono">"destroy"</span> | <span class="mono">"retain"</span> | <span class="mono">"snapshot"</span></span>




### local

_Type_ : <span class="mono">boolean</span>

Whether or not the app is running locally under `sst start`

### name

_Type_ : <span class="mono">string</span>

The name of your app, comes from the `name` in your `sst.json`

### region

_Type_ : <span class="mono">string</span>

The region the app is being deployed to. If this is not specified as the --region option in the SST CLI, it'll default to the region in your sst.json.

### stage

_Type_ : <span class="mono">string</span>

The stage the app is being deployed to. If this is not specified as the --stage option, it'll default to the stage configured during the initial run of the SST CLI.

## Methods
An instance of `App` has the following methods.
### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(environment)
```
_Parameters_
- __environment__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>


Adds additional default environment variables to be applied to all Lambda functions in the app.


```js
app.addDefaultFunctionPermissions({
  "MY_ENV_VAR": "my-value"
})
```

### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers)
```
_Parameters_
- __layers__ <span class='mono'>Array&lt;<span class="mono">[ILayerVersion](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.ILayerVersion.html)</span>&gt;</span>


Adds additional default layers to be applied to all Lambda functions in the stack.

### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Adds additional default Permissions to be applied to all Lambda functions in the app.


```js
app.addDefaultFunctionPermissions(["s3"])
```

### logicalPrefixedName

```ts
logicalPrefixedName(logicalName)
```
_Parameters_
- __logicalName__ <span class="mono">string</span>


Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.


```js
console.log(app.logicalPrefixedName("myTopic"));

// dev-my-app-myTopic
```

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props)
```
_Parameters_
- __props__ <span class='mono'><span class="mono">[FunctionProps](Function#functionprops)</span> | <span class="mono">[Stack](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html)</span> => <span class="mono">[FunctionProps](Function#functionprops)</span></span>


The default function props to be applied to all the Lambda functions in the app. These default values will be overridden if a Function sets its own props.
This needs to be called before a stack with any functions have been added to the app.


```js
app.setDefaultFunctionProps({
  runtime: "nodejs12.x",
  timeout: 30
})
```

### setDefaultRemovalPolicy

```ts
setDefaultRemovalPolicy(policy)
```
_Parameters_
- __policy__ <span class='mono'><span class="mono">"destroy"</span> | <span class="mono">"retain"</span> | <span class="mono">"snapshot"</span></span>


The default removal policy that'll be applied to all the resources in the app. This can be useful to set ephemeral (dev or feature branch) environments to remove all the resources on deletion.
:::danger
Make sure to not set the default removal policy to `DESTROY` for production environments.
:::


```js
app.setDefaultRemovalPolicy(app.local ? "destroy" : "retain")
```

## AppDeployProps


### buildDir?

_Type_ : <span class="mono">string</span>

### debugBridge?

_Type_ : <span class="mono">string</span>

### debugBucketArn?

_Type_ : <span class="mono">string</span>

### debugBucketName?

_Type_ : <span class="mono">string</span>

### debugEndpoint?

_Type_ : <span class="mono">string</span>

### debugIncreaseTimeout?

_Type_ : <span class="mono">boolean</span>

### debugStartedAt?

_Type_ : <span class="mono">number</span>

### esbuildConfig?

_Type_ : <span class="mono">string</span>

### name?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">- Defaults to empty string</span>

The app name, used to prefix stacks.

### region?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">- Defaults to us-east-1</span>

The region to deploy this app to.

### skipBuild?

_Type_ : <span class="mono">boolean</span>

### stage?

_Type_ : <span class="mono">string</span>

_Default_ : <span class="mono">- Defaults to dev</span>

The stage to deploy this app to.
