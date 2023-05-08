The `Queue` construct is a higher level CDK construct that makes it easy to create a [SQS Queues](https://aws.amazon.com/sqs/). You can create a queue by specifying a consumer function. And then publish to the queue from any part of your serverless app.

This construct makes it easier to define a queue and a consumer. It also internally connects the consumer and queue together.

## Examples

### Using the minimal config

```js
import { Queue } from "sst/constructs";

new Queue(stack, "Queue", {
  consumer: "src/queueConsumer.main",
});
```

### Configuring consumers

#### Lazily adding consumer

Create an _empty_ queue and lazily add the consumer.

```js {3}
const queue = new Queue(stack, "Queue");

queue.addConsumer(stack, "src/queueConsumer.main");
```

#### Configuring the consumer function

```js {3-8}
new Queue(stack, "Queue", {
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

#### Configuring the consumer event source

Configure the internally created CDK `Event Source`.

```js {5-7}
new Queue(stack, "Queue", {
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

#### Giving the consumer some permissions

Allow the consumer function to access S3.

```js {5}
const queue = new Queue(stack, "Queue", {
  consumer: "src/queueConsumer.main",
});

queue.attachPermissions(["s3"]);
```

### FIFO queue

```js {4-6}
new Queue(stack, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: {
      fifo: true,
    },
  },
});
```

### Advanced examples

#### Configuring the SQS queue

Configure the internally created CDK `Queue` instance.

```js {6-9}
import { Duration } from "aws-cdk-lib";

new Queue(stack, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: {
      queueName: "my-queue",
      visibilityTimeout: Duration.seconds(5),
    },
  },
});
```

#### Importing an existing queue

Override the internally created CDK `Queue` instance.

```js {6}
import * as sqs from "aws-cdk-lib/aws-sqs";

new Queue(stack, "Queue", {
  consumer: "src/queueConsumer.main",
  cdk: {
    queue: sqs.Queue.fromQueueArn(stack, "MySqsQueue", queueArn),
  },
});
```

#### Using existing Lambda functions as consumer

```js {7-10}
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";

new Queue(stack, "Queue", {
  consumer: {
    cdk: {
      function: lambda.Function.fromFunctionAttributes(stack, "IFunction", {
        functionArn: "arn:aws:lambda:us-east-1:123456789:function:my-function",
        role: iam.Role.fromRoleArn(
          stack,
          "IRole",
          "arn:aws:iam::123456789:role/my-role"
        ),
      }),
    },
  },
});
```
