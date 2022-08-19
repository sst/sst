<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Stack(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[StackProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html)</span>
## Properties
An instance of `Stack` has the following properties.
### stage

_Type_ : <span class="mono">string</span>

The current stage of the stack.

## Methods
An instance of `Stack` has the following methods.
### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(environment)
```
_Parameters_
- __environment__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>


Adds additional default environment variables to be applied to all Lambda functions in the stack.


```js
stack.addDefaultFunctionEnv({
  DYNAMO_TABLE: table.name
});
```

### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers)
```
_Parameters_
- __layers__ <span class='mono'>Array&lt;<span class="mono">[ILayerVersion](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.ILayerVersion.html)</span>&gt;</span>


Adds additional default layers to be applied to all Lambda functions in the stack.


```js
stack.addDefaultFunctionLayers(["arn:aws:lambda:us-east-1:123456789012:layer:nodejs:3"]);
```

### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Adds additional default Permissions to be applied to all Lambda functions in the stack.


```js
stack.addDefaultFunctionPermissions(["sqs", "s3"]);
```

### addOutputs

```ts
addOutputs(outputs)
```
_Parameters_
- __outputs__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">string</span> | <span class="mono">[CfnOutputProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnOutputProps.html)</span></span>&gt;</span>


Add outputs to this stack


```js
stack.addOutputs({
  TableName: table.name,
});
```

```js
stack.addOutputs({
  TableName: {
    value: table.name,
    exportName: "MyTableName",
  }
});
```

### createStackMetadataResource

```ts
createStackMetadataResource(metadata)
```
_Parameters_
- __metadata__ <span class="mono">any</span>
### getAllFunctions

```ts
getAllFunctions()
```


Returns all the Function instances in this stack.


```js
stack.getAllFunctions();
```

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props)
```
_Parameters_
- __props__ <span class="mono">[FunctionProps](Function#functionprops)</span>


The default function props to be applied to all the Lambda functions in the stack.


```js
stack.setDefaultFunctionProps({
  srcPath: "backend",
  runtime: "nodejs16.x",
});
```
