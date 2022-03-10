---
description: "Docs for the sst.Queue construct in the @serverless-stack/resources package"
---


## Constructor
```ts
new Queue(scope: Construct, id: string, props: QueueProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`QueueProps`](#queueprops)
## Properties
An instance of `Queue` has the following properties.
### consumerFunction

_Type_ : [`Function`](Function)

### sqsQueue

_Type_ : [`Queue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Queue.html)

## Methods
An instance of `Queue` has the following methods.
### addConsumer

```ts
addConsumer(scope: Construct, consumer: unknown)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- consumer [`FunctionDefinition`](FunctionDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
## QueueConsumerProps
### consumerProps

_Type_ : [`SqsEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsEventSourceProps.html)

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## QueueProps
### consumer

_Type_ : [`FunctionDefinition`](FunctionDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)

### sqsQueue

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)&nbsp; | &nbsp;[`QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.QueueProps.html)
