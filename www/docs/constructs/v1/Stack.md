---
description: "Docs for the sst.Stack construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The Stack construct extends cdk.Stack. It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensure that the stack uses the same AWS profile and region as the app.

## Constructor
```ts
new Stack(scope: Construct, id: string, props: StackProps)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[StackProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html)</span>

## Examples

### Creating a new stack

```js
import { Stack } from "@serverless-stack/resources";

export default class MyStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    // Define your stack
  }
}
```


[See more examples here](/snippets/Stack)
## Properties
An instance of `Stack` has the following properties.
### stage

_Type_ : <span class="mono">string</span>

The current stage of the stack.

## Methods
An instance of `Stack` has the following methods.
### addConstructsMetadata

```ts
addConstructsMetadata(metadata: any)
```
_Parameters_
- __metadata__ <span class="mono">any</span>






### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(environment: Record)
```
_Parameters_
- __environment__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">string</span>&gt;</span>


Adds additional default environment variables to be applied to all Lambda functions in the stack.

#### Examples

```js
stack.addDefaultFunctionEnv({
  DYNAMO_TABLE: table.name
})
```

### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers: unknown)
```
_Parameters_
- __layers__ <span class='mono'>Array&lt;<span class="mono">[ILayerVersion](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.ILayerVersion.html)</span>&gt;</span>


Adds additional default layers to be applied to all Lambda functions in the stack.

#### Examples

```js
  stack.addDefaultFunctionLayers(["arn:aws:lambda:us-east-1:123456789012:layer:nodejs:3"])
```

### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Adds additional default Permissions to be applied to all Lambda functions in the stack.

#### Examples

```js
stack.addDefaultFunctionPermissions(["sqs", "s3"])
```

### addOutputs

```ts
addOutputs(outputs: Record)
```
_Parameters_
- __outputs__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class="mono">string</span> | <span class="mono">[CfnOutputProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CfnOutputProps.html)</span></span>&gt;</span>


Add outputs to this stack

#### Examples

```js
stack.addOutputs({
  table: table.name,
})
```

### getAllFunctions

```ts
getAllFunctions(undefined)
```


Returns all the Function instances in this stack.

#### Examples

```js
stack.getAllFunctions()
```

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps)
```
_Parameters_
- __props__ <span class="mono">[FunctionProps](Function)</span>


The default function props to be applied to all the Lambda functions in the stack.

#### Examples

```js
stack.setDefaultFunctionProps({
  srcPath: "backend",
  runtime: "nodejs14.x",
})
```
