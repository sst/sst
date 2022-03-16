---
description: "Docs for the sst.Stack construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Stack(scope: Construct, id: string, props: StackProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`StackProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html)
## Properties
An instance of `Stack` has the following properties.
### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### stage

_Type_ : `string`

## Methods
An instance of `Stack` has the following methods.
### addConstructsMetadata

```ts
addConstructsMetadata(metadata: any)
```
_Parameters_
- __metadata__ `any`
### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(environment: Record)
```
_Parameters_
- __environment__ Record<`string`, `string`>
### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers: unknown)
```
_Parameters_
- __layers__ [`ILayerVersion`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ILayerVersion.html)
### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### addOutputs

```ts
addOutputs(outputs: unknown)
```
_Parameters_
- __outputs__ 

### getAllFunctions

```ts
getAllFunctions(undefined)
```
### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps)
```
_Parameters_
- __props__ [`FunctionProps`](FunctionProps)