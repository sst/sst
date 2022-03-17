---
description: "Docs for the sst.Queue construct in the @serverless-stack/resources package"
---
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


### Lazily adding consumer

Create an _empty_ queue and lazily add the consumer.

```js {3}
const queue = new Queue(this, "Queue");

queue.addConsumer(this, "src/queueConsumer.main");
```


### Giving the consumer some permissions

Allow the consumer function to access S3.

```js {5}
const queue = new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
});

queue.attachPermissions(["s3"]);
```


### Configuring the consumer

#### Configuring the function props

```js {3-8}
new Queue(this, "Queue", {
  consumer: {
    function: {
      handler: "src/queueConsumer.main",
      timeout: 10,
      environment: { bucketName: bucket.bucketName },
      permissions: [bucket],
    },
  },
});
```

#### Configuring the consumption props

Configure the internally created CDK `Event Source`.

```js {4-6}
new Queue(this, "Queue", {
  consumer: {
    function: "src/queueConsumer.main",
    consumerProps: {
      batchSize: 5,
    },
  },
});
```


### Creating a FIFO queue

```js {4-6}
new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: {
      fifo: true,
    },
  }
});
```

### Configuring the SQS queue

Configure the internally created CDK `Queue` instance.

```js {6-9}
new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: {
      queueName: "my-queue",
      visibilityTimeout: "5 seconds",
    }
  }
});
```

### Importing an existing queue

Override the internally created CDK `Queue` instance.

```js {5}
import { Queue } from "aws-cdk-lib/aws-sqs";

new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: Queue.fromQueueArn(this, "MySqsQueue", queueArn),
  }
});
```

## Properties
An instance of `Queue` has the following properties.

### cdk.queue

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)

The internally created CDK `Queue` instance.


### consumerFunction

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

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches additional permissions to the consumer function

## QueueConsumerProps

### cdk.eventSource

_Type_ : [`SqsEventSourceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsEventSourceProps.html)

This allows you to override the default settings this construct uses internally to create the consumer.


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

Used to create the consumer function for the queue.

## QueueProps

### cdk.queue

_Type_ : [`IQueue`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IQueue.html)&nbsp; | &nbsp;[`QueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.QueueProps.html)

This allows you to override the default settings this construct uses internally to create the queue.


### consumer

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`QueueConsumerProps`](#queueconsumerprops)

Used to create the consumer for the queue.
