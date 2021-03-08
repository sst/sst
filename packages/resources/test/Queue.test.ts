import "@aws-cdk/assert/jest";
import { ABSENT } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as sqs from "@aws-cdk/aws-sqs";
import { App, Stack, Queue, Function } from "../src";

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

test("constructor-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue");
  expect(stack).toCountResources("AWS::SQS::Queue", 1);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 0);
});

test("sqsQueue-is-sqsQueueConstruct", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new sqs.Queue(stack, "Q", {
    queueName: "my-queue",
  });
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    sqsQueue: queue,
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::SQS::Queue", 1);
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "my-queue",
  });
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
  expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
    BatchSize: ABSENT,
  });
});

test("sqsQueue-is-sqsQueueProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    sqsQueue: {
      queueName: "my-queue",
      visibilityTimeout: cdk.Duration.seconds(5),
    },
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::SQS::Queue", 1);
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "my-queue",
    VisibilityTimeout: 5,
  });
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
});

test("consumer-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::SQS::Queue", 1);
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "dev-my-app-Queue",
  });
});

test("consumer-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Queue(stack, "Queue", {
    consumer: f,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "dev-my-app-Queue",
  });
});

test("consumer-FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {
    consumer: { handler: "test/lambda.handler" },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "dev-my-app-Queue",
  });
});

test("consumer-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {
    consumer: {
      function: "test/lambda.handler",
      consumerProps: {
        batchSize: 5,
      },
    },
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toHaveResource("AWS::SQS::Queue", {
    QueueName: "dev-my-app-Queue",
  });
  expect(stack).toHaveResource("AWS::Lambda::EventSourceMapping", {
    BatchSize: 5,
  });
});

test("consumer-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {});
  expect(stack).toCountResources("AWS::SQS::Queue", 1);
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 0);
});

test("addConsumer", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 0);
  queue.addConsumer(stack, "test/lambda.handler");
  expect(stack).toCountResources("AWS::Lambda::EventSourceMapping", 1);
  expect(() => {
    queue.addConsumer(stack, "test/lambda.handler");
  }).toThrow(/Cannot configure more than 1 consumer for a Queue/);
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  queue.attachPermissions(["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "QueueConsumerServiceRoleDefaultPolicy8A09B9BC",
  });
});

test("attachPermissions-after-addConsumer", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  queue.attachPermissions(["s3"]);
  queue.addConsumer(stack, "test/lambda.handler");
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ConsumerServiceRoleDefaultPolicy0717ECC4",
  });
});
