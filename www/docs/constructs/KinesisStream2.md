---
description: "Docs for the sst.KinesisStream construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new KinesisStream(scope: Construct, id: string, props: KinesisStreamProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`KinesisStreamProps`](#kinesisstreamprops)
## Properties
An instance of `KinesisStream` has the following properties.
### kinesisStream

_Type_ : [`IStream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IStream.html)

### streamArn

_Type_ : `string`

### streamName

_Type_ : `string`

## Methods
An instance of `KinesisStream` has the following methods.
### addConsumers

```ts
addConsumers(scope: Construct, consumers: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- consumers unknown
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- consumerName `string`
- permissions [`Permissions`](Permissions)
### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- consumerName `string`
## KinesisStreamConsumerProps
### consumerProps

_Type_ : [`KinesisEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.KinesisEventSourceProps.html)

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## KinesisStreamProps
### consumers

_Type_ : unknown

### defaultFunctionProps

_Type_ : [`FunctionProps`](FunctionProps)

### kinesisStream

_Type_ : [`IStream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IStream.html)&nbsp; | &nbsp;[`StreamProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StreamProps.html)
