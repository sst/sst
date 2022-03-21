---
description: "Docs for the sst.Queue construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Queue` construct is a higher level CDK construct that makes it easy to create a [SQS Queues](https://aws.amazon.com/sqs/). You can create a queue by specifying a consumer function. And then publish to the queue from any part of your serverless app.

This construct makes it easier to define a queue and a consumer. It also internally connects the consumer and queue together.


## Constructor
```ts
new Queue(scope: Construct, id: string, props: QueueProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`QueueProps`](#queueprops)

## Examples

### Using the minimal config

```js
import { Queue } from "@serverless-stack/resources";

new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
});
```

## Properties
An instance of `Queue` has the following properties.

### cdk.queue

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)

The internally created CDK `Queue` instance.


### consumerFunction?

_Type_ : [`Function`](Function)

The internally created consumer `Function` instance.

## Methods
An instance of `Queue` has the following methods.
### addConsumer

```ts
addConsumer(scope: Construct, consumer: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __consumer__ [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)


Adds a consumer after creating the queue. Note only one consumer can be added to a queue

#### Examples

```js {3}
const queue = new Queue(props.stack, "Queue");
queue.addConsumer(props.stack, "src/function.handler");
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to the consumer function

#### Examples

```js
const queue = new Queue(this, "Queue", {
  consumer: "src/function.handler",
});
queue.attachPermissions(["s3"]);
```

## QueueConsumerProps
Used to define the consumer for the queue and invocation details


### cdk.eventSource?

_Type_ : [`SqsEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsEventSourceProps.html)

This allows you to override the default settings this construct uses internally to create the consumer.

#### Examples

```js
new Queue(props.stack, "Queue", {
  consumer: {
    function: "test/lambda.handler",
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  },
});
```


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

Used to create the consumer function for the queue.

#### Examples

```js
new Queue(this, "Queue", {
  consumer: {
    function: {
      handler: "src/function.handler",
      timeout: 10,
    },
  },
});
```

## QueueProps



### cdk.queue?

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)&nbsp; | &nbsp;[`QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.QueueProps.html)

Override the default settings this construct uses internally to create the queue.

#### Examples

```js
new Queue(this, "Queue", {
  consumer: "src/function.handler",
  cdk: {
    queue: {
      fifo: true,
    },
  }
});
```


### consumer?

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)

Used to create the consumer for the queue.

#### Examples

```js
new Queue(props.stack, "Queue", {
  consumer: "src/function.handler",
})
```
