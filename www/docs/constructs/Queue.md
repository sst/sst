---
id: Queue
title: "Queue"
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

### Specifying the function props

Using the [`FunctionProps`](Function.md#functionprops).

```js
new Queue(this, "Queue", {
  consumer: {
    srcPath: "src/"
    handler: "queues/lambda.main",
  }
});
```

### Manually creating the queue

Override the internally created CDK `Queue` instance.

```js
new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  sqsQueue: new sqs.Queue(this, "MySqsQueue", {
    queueName: "my-queue",
  }),
});
```

### Giving the consumer some permissions

Allow the consumer function to access S3.

```js {5}
const queue = new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
});

queue.attachPermissions(["s3"]);
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

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to the `consumerFunction`. This allows the consumer to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## QueueProps

### consumer

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the consumer function for the queue.

### sqsQueue?

_Type_ : [`cdk.aws-sqs.Queue`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sqs.Queue.html), _defaults to_ `undefined`

Or optionally pass in a CDK `Queue` instance. This allows you to override the default settings this construct uses internally to create the queue.
