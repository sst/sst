---
title: Asynchronous Tasks
description: "How to perform asynchronous tasks in your SST app"
---

SST offers a couple of ways to run asynchronous tasks. They address different use cases, so let's look at them below.

## Types

### Queue

The [`Queue`](constructs/Queue.md) construct uses [Amazon Simple Queue Service (SQS)](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) behind the scenes. A `Queue` can have only one consumer that pulls the messages of the queue. A consumer is a Lambda function.

```js
import { Queue } from "sst/constructs";

new Queue(stack, "MyQueue", {
  consumer: "src/consumer.main",
});
```

You can also create a FIFO version of the queue.

```js {3}
new Queue(stack, "MyQueue", {
  cdk: {
    queue: {
      fifo: true,
    },
  },
  consumer: "src/consumer.main",
});
```

:::tip Example

Follow this tutorial on how to create a simple queue system in SST.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-queues-in-your-serverless-app.html)

:::

### Topic

The [`Topic`](constructs/Topic.md) construct supports a pub/sub model using [Amazon SNS](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) behind the scenes. A `Topic` can have multiple subscribers.

```js
import { Topic } from "sst/constructs";

new Topic(stack, "MyQueue", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

You can also create a FIFO version of the Topic.

```js {3}
new Topic(stack, "MyQueue", {
  cdk: {
    topic: {
      fifo: true,
    },
  },
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

:::tip Example

This example shows you how to create a simple pub/sub system in SST.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-pub-sub-in-your-serverless-app.html)

:::

### KinesisStream

The [`KinesisStream`](constructs/KinesisStream.md) construct uses [Amazon Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html). It's similar to the [`Queue`](constructs/Queue.md) in the way that the consumer pulls the messages, but it's designed to allow for multiple consumers. `KinesisStream` also keeps a record of historical messages for up to 365 days, and consumers can re-process them. This makes it a good fit for cases where you are dealing with a large amount of messages or events.

```js
import { KinesisStream } from "sst/constructs";

new KinesisStream(stack, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  },
});
```

### EventBus

The [`EventBus`](constructs/EventBus.md) construct uses [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html) behind the scenes. Similar to `Topic`, it's a pub/sub model. Added to that, you can **archive** the messages coming in to the `EventBus` and **replay** them later.

```js
import { EventBus } from "sst/constructs";

new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

## Which one should I use?

You should always try to use the [`Topic`](constructs/Topic.md) or [`Queue`](constructs/Queue.md) constructs first. They are simple, lightweight, low latency, highly scalable, and have pay per use pricing. And use [`KinesisStream`](constructs/KinesisStream.md) or [`EventBus`](constructs/EventBus.md) if you are dealing with vast amount of data, or when you need more advanced functionality.
