---
description: "Snippets for the sst.Queue construct"
---

## Using the minimal config

```js
import { Queue } from "@serverless-stack/resources";

new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
});
```

## Lazily adding consumer

Create an _empty_ queue and lazily add the consumer.

```js {3}
const queue = new Queue(this, "Queue");

queue.addConsumer(this, "src/queueConsumer.main");
```

## Giving the consumer some permissions

Allow the consumer function to access S3.

```js {5}
const queue = new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
});

queue.attachPermissions(["s3"]);
```

## Creating a FIFO queue

```js {4-6}
new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: {
      fifo: true,
    },
  },
});
```

## Configuring the SQS queue

Configure the internally created CDK `Queue` instance.

```js {6-9}
import { Duration } from "aws-cdk-lib";

new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: {
      queueName: "my-queue",
      visibilityTimeout: Duration.seconds(5),
    },
  },
});
```

## Configuring the consumer

### Configuring the function props

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

### Configuring the consumption props

Configure the internally created CDK `Event Source`.

```js {5-7}
new Queue(this, "Queue", {
  consumer: {
    function: "src/queueConsumer.main",
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  },
});
```

## Importing an existing queue

Override the internally created CDK `Queue` instance.

```js {6}
import { Queue } from "aws-cdk-lib/aws-sqs";

new Queue(this, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: Queue.fromQueueArn(this, "MySqsQueue", queueArn),
  },
});
```
