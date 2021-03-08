---
description: "Docs for the sst.Queue construct in the @serverless-stack/resources package. This construct creates an SQS queue."
---

The `Queue` construct is a higher level CDK construct that makes it easy to create a [SQS Queues](https://aws.amazon.com/sqs/). You can create a queue by specifying a consumer function. And then publish to the queue from any part of your serverless app.

This construct makes it easier to define a queue and a consumer. It also internally connects the consumer and queue together.

## Initializer

```ts
new Queue(scope: Construct, id: string, props: QueueProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`QueueProps`](#queueprops)

## Examples

### Using the minimal config

```js
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

### Configuring the SQS queue

Configure the internally created CDK `Queue` instance.

```js {3-6}
new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  sqsQueue: {
    queueName: "my-queue",
    visibilityTimeout: cdk.Duration.seconds(5),
  },
});
```

### Configuring the consumer

Configure the internally created CDK `Event Source`.

```js {2-7}
new Queue(this, "Queue", {
  consumer: {
    function: "src/queueConsumer.main",
    consumerProps: {
      batchSize: 5,
    },
  },
});
```

### Importing an existing queue

Override the internally created CDK `Queue` instance.

```js {3}
new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  sqsQueue: sqs.Queue.fromQueueArn(this, "MySqsQueue", queueArn),
});
```

## Properties

An instance of `Queue` contains the following properties.

### sqsQueue

_Type_ : [`cdk.aws-sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html)

The internally created CDK `Queue` instance.

### consumerFunction

_Type_ : [`Function`](Function.md)

The internally created consumer `Function` instance.

## Methods

An instance of `Queue` contains the following methods.

### addConsumer

```ts
addConsumer(scope: cdk.Construct, consumer: FunctionDefinition | QueueConsumerProps)
```

_Parameters_

- **scope** `cdk.Construct`
- **consumer** `FunctionDefinition | TopicSubscriberProps`

Takes [`FunctionDefinition`](Function.md#functiondefinition) or [`QueueConsumerProps`](#queueconsumerprops) object that'll be used to create the consumer for the queue.

Note that, only 1 consumer can be added to a queue.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to the `consumerFunction`. This allows the consumer to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## QueueProps

### consumer?

_Type_ : `FunctionDefinition | QueueConsumerProps`, _defaults to_ `undefined`

Takes [`FunctionDefinition`](Function.md#functiondefinition) or [`QueueConsumerProps`](#queueconsumerprops) object used to create the consumer for the queue.

### sqsQueue?

_Type_ : `cdk.aws-sqs.Queue | cdk.aws-sqs.QueueProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-sqs.QueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.QueueProps.html) or a [`cdk.aws-sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html) instance. This allows you to override the default settings this construct uses internally to create the queue.

## QueueConsumerProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the consumer function for the queue.

### consumerProps?

_Type_ : [`cdk.aws-lambda-event-sources.lambdaEventSources.SqsEventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.SqsEventSourceProps.html), _defaults to_ `undefined`

Or optionally pass in a CDK `SqsEventSourceProps`. This allows you to override the default settings this construct uses internally to create the consumer.
