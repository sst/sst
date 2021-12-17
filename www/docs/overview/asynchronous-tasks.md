---
title: Asynchronous Tasks 🟢
description: "How to perform asynchronous tasks in your SST app"
---

SST offers a couple of ways for performing asynchronous tasks. Depending on the use case, you can choose the ones that fit the need.

## Queue

The [Queue](../constructs/Queue.md) construct uses [SQS Queue](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) behind the scene. A Queue can have only one consumer that pulls the messages.

```js
import { Queue } from "@serverless-stack/resources";

new Queue(this, "MyQueue", {
  consumer: "src/consumer.main",
});
```

You can also create a FIFO queue.

```js
import { Queue } from "@serverless-stack/resources";

new Queue(this, "MyQueue", {
  sqsQueue: {
    fifo: true,
  },
  consumer: "src/consumer.main",
});
```

:::info Example

This tutorial steps through creating a simple queue system with SQS.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-queues-in-your-serverless-app.html)

:::

## Topic

The [Topic](../constructs/Topic.md) construct is a pub/sub model that uses [SNS Topic](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) behind the scene. A Topic can have multiple subscribers.

```js
import { Topic } from "@serverless-stack/resources";

new Topic(this, "MyQueue", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

You can also create a FIFO Topic.

```js
import { Topic } from "@serverless-stack/resources";

new Topic(this, "MyQueue", {
  snsTopic: {
    fifo: true,
  },
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

:::info Example

This tutorial steps through creating a simple pub/sub system with SNS.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-pub-sub-in-your-serverless-app.html)

:::

## KinesisStream

The [KinesisStream](../constructs/KinesisStream.md) construct uses [Kinesis Data Stream](https://docs.aws.amazon.com/streams/latest/dev/introduction.html) behind the scene. It is similar to Queue in the way that the consumer pulls the messages, but it is designed to process allows multiple consumers. KinesisStream also keeps a record of historical messages for up to 365 days, and consumers can re-process them.

```js
import { KinesisStream } from "@serverless-stack/resources";

new KinesisStream(this, "Stream", {
  consumers: {
    consumer1: "src/consumer1.main",
    consumer2: "src/consumer2.main",
  }
});
```

## EventBus

The [EventBus](../constructs/EventBus.md) construct uses [EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html) behind the scene. Similar to Topic, it is a pub/sub model. On top of that, you can **archive** the messages coming to the EventBus and **replay** them later.

```js
import { EventBus } from "@serverless-stack/resources";

new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

## When to use which?

You should always try to use Topic and Queue first. They are very lightweight, low latency, highly scalable, and have pay as you go pricing. And use KinesisStream and EventBus if you are dealing with vast amount of data, or when you need more advanced functionality.
