---
description: "Docs for the sst.Queue construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Queue(scope: Construct, id: string, props: QueueProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`QueueProps`](#queueprops)
## Properties
An instance of `Queue` has the following properties.

### cdk.queue

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)


### consumerFunction

_Type_ : [`Function`](Function)

## Methods
An instance of `Queue` has the following methods.
### addConsumer

```ts
addConsumer(scope: Construct, consumer: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumer__ [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)
## QueueConsumerProps

### cdk.eventSource

_Type_ : [`SqsEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsEventSourceProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## QueueProps

### cdk.queue

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)&nbsp; | &nbsp;[`QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.QueueProps.html)


### consumer

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)
