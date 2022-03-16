---
description: "Docs for the sst.KinesisStream construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new KinesisStream(scope: Construct, id: string, props: KinesisStreamProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`KinesisStreamProps`](#kinesisstreamprops)
## Properties
An instance of `KinesisStream` has the following properties.

### cdk.stream

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
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumers__ 

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
### attachPermissionsToConsumer

```ts
attachPermissionsToConsumer(consumerName: string, permissions: Permissions)
```
_Parameters_
- __consumerName__ `string`
- __permissions__ [`Permissions`](Permissions)
### getFunction

```ts
getFunction(consumerName: string)
```
_Parameters_
- __consumerName__ `string`
## KinesisStreamConsumerProps

### cdk.eventSource

_Type_ : [`KinesisEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.KinesisEventSourceProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## KinesisStreamProps

### cdk.stream

_Type_ : [`IStream`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IStream.html)&nbsp; | &nbsp;[`StreamProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StreamProps.html)






### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)

