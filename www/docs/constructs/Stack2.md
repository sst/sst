---
description: "Docs for the sst.Stack construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Stack(scope: Construct, id: string, props: StackProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`StackProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html)
## Properties
An instance of `Stack` has the following properties.
### defaultFunctionProps

_Type_ : unknown

### stage

_Type_ : `string`

## Methods
An instance of `Stack` has the following methods.
### addConstructsMetadata

```ts
addConstructsMetadata(metadata: any)
```
_Parameters_
- metadata `any`
### addDefaultFunctionEnv

```ts
addDefaultFunctionEnv(environment: Record)
```
_Parameters_
- environment [`Record`](Record)
### addDefaultFunctionLayers

```ts
addDefaultFunctionLayers(layers: unknown)
```
_Parameters_
- layers unknown
### addDefaultFunctionPermissions

```ts
addDefaultFunctionPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### addOutputs

```ts
addOutputs(outputs: unknown)
```
_Parameters_
- outputs unknown
### getAllFunctions

```ts
getAllFunctions(undefined)
```
### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps)
```
_Parameters_
- props [`FunctionProps`](FunctionProps)