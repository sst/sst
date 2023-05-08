---
title: Async Tasks
description: "Run asynchronous tasks in your SST app."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Run asynchronous tasks in your SST app.

</HeadlineText>

---

## Overview

Sometimes you might want to return a request to the user right away but run some tasks asynchronously. For example, you might want to process an order but send a confirmation email later. The easiest way to do this is to use a queue.

- When your API gets invoked, you place items in the queue
- Your API then returns right away
- Later, you process the items from the queue

Let's look at it in detail.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

---

## Create a queue

Let's start by adding a queue to our app.

```ts title="stacks/Default.ts"
const queue = new Queue(stack, "queue", {
  consumer: "packages/functions/src/consumer.handler",
});
```

:::info
A Queue can have only one consumer that can pull the messages from the queue.
:::

Make sure to import the [`Queue`](constructs/Queue.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Queue, StackContext, NextjsSite } from "sst/constructs";
```

This construct uses the [Amazon Simple Queue Service (SQS)](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html).

---

## Bind the queue

After adding the queue, bind your Next.js app to it.

```diff title="stacks/Default.ts"
const site = new NextjsSite(stack, "site", {
  path: "packages/web",
+ bind: [queue],
});
```

This allows us to access the queue in our Next.js app.

---

## Send to the queue

Now in our Next.js API we'll send a message to the queue.

```ts title="packages/web/pages/api/hello.ts" {8}
const sqs = new SQSClient({});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const command = new SendMessageCommand({
    QueueUrl: Queue.queue.queueUrl,
    MessageBody: "Hello from Next.js!",
  });
  await sqs.send(command);

  res.status(200).send("Hello World!");
}
```

---

#### Add the imports

Import the required packages.

```ts title="packages/web/pages/api/hello.ts"
import { Queue } from "sst/node/queue";
import type { NextApiRequest, NextApiResponse } from "next";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
```

Make sure to install the AWS SDK.

```bash
npm install @aws-sdk/client-sqs
```

---

## Add the queue handler

Finally, we can create the Lambda function that'll get invoked when things get sent to the queue.

```ts title="packages/functions/src/consumer.ts"
import { SQSEvent } from "aws-lambda";

export async function handler(event: SQSEvent) {
  const records: any[] = event.Records;
  console.log(`Message processed: "${records[0].body}"`);

  return {};
}
```

Now if you go to the API endpoint in your browser — `http://localhost:3000/api/hello`, you can go to your terminal and you'll notice that the message in the queue has been processed.

---

## Other options

Aside from queues you have a couple of other options for handling more complex asynchronous tasks in your app.

---

### Topics

The [`Topic`](constructs/Topic.md) construct supports a pub/sub model using [Amazon SNS](https://docs.aws.amazon.com/sns/latest/dg/welcome.html).

```ts title="stacks/Default.ts"
import { Topic } from "sst/constructs";

new Topic(stack, "topic", {
  subscribers: [
    "packages/functions/src/subscriber1.handler",
    "packages/functions/src/subscriber2.handler",
  ],
});
```

The main difference between a Topic and Queue is that a Topic can have **multiple subscribers**.

:::tip Tutorial

[Check out a tutorial](https://sst.dev/examples/how-to-use-pub-sub-in-your-serverless-app.html) on how a simple pub/sub system in SST.

:::

---

### KinesisStream

The [`KinesisStream`](constructs/KinesisStream.md) construct uses [Amazon Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html).

```ts title="stacks/Default.ts"
import { KinesisStream } from "sst/constructs";

new KinesisStream(stack, "stream", {
  consumers: {
    consumer1: "packages/functions/src/consumer1.handler",
    consumer2: "packages/functions/src/consumer2.handler",
  },
});
```

It's similar to the [`Queue`](constructs/Queue.md) in that the consumer pulls the messages, but it's designed to allow for multiple consumers. A KinesisStream also keeps a **record of historical messages** for up to 365 days, and consumers can **re-process them**. This makes it a good fit for cases where you are dealing with a large number of events.

---

### EventBus

The [`EventBus`](constructs/EventBus.md) construct uses [Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html).

```ts title="stacks/Default.ts"
import { EventBus } from "sst/constructs";

new EventBus(stack, "bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: [
        "packages/functions/src/target1.handler",
        "packages/functions/src/target2.handler",
      ],
    },
  },
});
```

Similar to a Topic, it's a pub/sub model. It can also **archive** the messages coming in to the EventBus and **replay** them later.

---

And that's it! You now know how to handle asynchronous tasks in your app. You also have a couple of options for when your app grows more complex.
