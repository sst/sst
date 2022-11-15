<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
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
### addDefaultFunctionBinding

```ts
addDefaultFunctionBinding(bind)
```
_Parameters_
- __bind__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds additional default resources to be applied to all Lambda functions in the app.


```js
app.addDefaultFunctionBinding([STRIPE_KEY, bucket]);
```

### addDefaultFunctionConfig

:::caution
This function signature has been deprecated.
```ts
addDefaultFunctionConfig(config)
```


Adds additional default config to be applied to all Lambda functions in the app.


```js
// Change
app.addDefaultFunctionConfig([STRIPE_KEY]);

// To
app.addDefaultFunctionBinding([STRIPE_KEY]);
```

The "addDefaultFunctionConfig" method will be removed in SST v2. Pass Parameters and Secrets in through the "addDefaultFunctionBinding" function. Read more about how to upgrade here — https://docs.sst.dev/upgrade-guide#upgrade-to-v116

:::
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

### runDeferredBuilds

```ts
runDeferredBuilds()
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
