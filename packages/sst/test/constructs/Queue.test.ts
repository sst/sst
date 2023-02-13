import { test, expect } from "vitest";
import { ABSENT, ANY, countResources, createApp, hasResource } from "./helper";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { App, Stack, Queue, Function, Bucket } from "../../dist/constructs/";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};
const queueDefaultPolicy = {
  Action: [
    "sqs:ReceiveMessage",
    "sqs:ChangeMessageVisibility",
    "sqs:GetQueueUrl",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ],
  Effect: "Allow",
  Resource: {
    "Fn::GetAtt": ["Queue381943A6", "Arn"],
  },
};

/////////////////////////////
// Test Constructor
/////////////////////////////

test("cdk.queue: is undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  const queue = new Queue(stack, "Queue");
  expect(queue.queueArn).toBeDefined();
  expect(queue.queueUrl).toBeDefined();
  expect(queue.queueName).toBeDefined();
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 0);
});

test("cdk.queue: is sqs.Queue construct", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    cdk: {
      queue: sqs.Queue.fromQueueArn(
        stack,
        "Q",
        "arn:aws:sqs:us-east-1:123:queue"
      ),
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
  countResources(stack, "AWS::SQS::Queue", 0);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    BatchSize: ABSENT,
  });
});

test("cdk.queue: is QueueProps", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    cdk: {
      queue: {
        queueName: "my-queue",
        visibilityTimeout: cdk.Duration.seconds(5),
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
  countResources(stack, "AWS::SQS::Queue", 1);
  hasResource(stack, "AWS::SQS::Queue", {
    QueueName: "my-queue",
    VisibilityTimeout: 5,
  });
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
});

test("cdk.queue: fifo does not override custom name", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(
    () =>
      new Queue(stack, "Queue", {
        cdk: {
          queue: {
            queueName: "myqueue",
            fifo: true,
          },
        },
      })
  ).toThrow(/FIFO queue names must end in '.fifo/);
});

test("cdk.queue: fifo appends to name", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    cdk: {
      queue: {
        fifo: true,
      },
    },
  });
  hasResource(stack, "AWS::SQS::Queue", {
    QueueName: "test-app-Queue.fifo",
  });
});

test("consumer: is string", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
  countResources(stack, "AWS::SQS::Queue", 1);
  hasResource(stack, "AWS::SQS::Queue", {
    QueueName: "test-app-Queue",
  });
});

test("consumer: is Function", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Queue(stack, "Queue", {
    consumer: f,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
  hasResource(stack, "AWS::SQS::Queue", {
    QueueName: "test-app-Queue",
  });
});

test("consumer: is props", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    consumer: {
      function: "test/lambda.handler",
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
  hasResource(stack, "AWS::SQS::Queue", {
    QueueName: "test-app-Queue",
  });
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    BatchSize: 5,
  });
});

test("consumer: is cdk.Function", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    consumer: {
      cdk: {
        function: lambda.Function.fromFunctionAttributes(stack, "IFunction", {
          functionArn: "arn:aws:lambda:us-east-1:123456789:function:test",
          role: iam.Role.fromRoleArn(
            stack,
            "IRole",
            "arn:aws:iam::123456789:role/test"
          ),
        }),
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    FunctionName: "test",
    EventSourceArn: ANY,
  });
});

test("consumer: is undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {});
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 0);
});

test("fifo does not override custom name", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(
    () =>
      new Queue(stack, "Queue", {
        cdk: {
          queue: {
            queueName: "myqueue",
            fifo: true,
          },
        },
      })
  ).toThrow(/FIFO queue names must end in '.fifo/);
});

test("fifo appends to name", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Queue(stack, "Queue", {
    cdk: {
      queue: {
        fifo: true,
      },
    },
  });
  hasResource(stack, "AWS::SQS::Queue", {
    QueueName: "test-app-Queue.fifo",
  });
});

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: debugIncreaseTimeout true: visibilityTimeout not set", async () => {
  const app = await createApp();
  // @ts-expect-error
  app.debugIncreaseTimeout = true;
  const stack = new Stack(app, "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  hasResource(stack, "AWS::SQS::Queue", {
    VisibilityTimeout: 900,
  });
});

test("constructor: debugIncreaseTimeout true: visibilityTimeout set to < 900", async () => {
  const app = await createApp();
  // @ts-expect-error
  app.debugIncreaseTimeout = true;
  const stack = new Stack(app, "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    cdk: {
      queue: {
        visibilityTimeout: cdk.Duration.seconds(100),
      },
    },
  });
  hasResource(stack, "AWS::SQS::Queue", {
    VisibilityTimeout: 900,
  });
});

test("constructor: debugIncreaseTimeout true: visibilityTimeout set to > 900", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    cdk: {
      queue: {
        visibilityTimeout: cdk.Duration.seconds(1000),
      },
    },
  });
  hasResource(stack, "AWS::SQS::Queue", {
    VisibilityTimeout: 1000,
  });
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("addConsumer", async () => {
  const stack = new Stack(await createApp(), "stack");
  const queue = new Queue(stack, "Queue");
  queue.addConsumer(stack, "test/lambda.handler");
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
  expect(() => {
    queue.addConsumer(stack, "test/lambda.handler");
  }).toThrow(/Cannot configure more than 1 consumer for a Queue/);
});

test("attachPermissions", async () => {
  const stack = new Stack(await createApp(), "stack");
  const queue = new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  queue.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "QueueConsumerQueueServiceRoleDefaultPolicy01B8CD9A",
  });
});

test("attachPermissions-after-addConsumer", async () => {
  const stack = new Stack(await createApp(), "stack");
  const queue = new Queue(stack, "Queue");
  queue.attachPermissions(["s3"]);
  queue.addConsumer(stack, "test/lambda.handler");
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ConsumerQueueServiceRoleDefaultPolicyDF171F68",
  });
});

test("bind", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const queue = new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  queue.bind([bucket]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: ANY },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "QueueConsumerQueueServiceRoleDefaultPolicy01B8CD9A",
  });
});

test("bind-after-addConsumer", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const queue = new Queue(stack, "Queue");
  queue.bind([bucket]);
  queue.addConsumer(stack, "test/lambda.handler");
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: ANY },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ConsumerQueueServiceRoleDefaultPolicyDF171F68",
  });
});
