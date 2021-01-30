import '@aws-cdk/assert/jest';
import * as sqs from "@aws-cdk/aws-sqs";
import { App, Stack, Queue, Function, FunctionPermissionType } from "../src";

const lambdaDefaultPolicy = {
  Action: [
    "xray:PutTraceSegments",
    "xray:PutTelemetryRecords"
  ],
  Effect: "Allow",
  Resource: "*"
};
const queueDefaultPolicy = {
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:ChangeMessageVisibility",
    "sqs:GetQueueUrl",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ],
  "Effect": "Allow",
  "Resource": {
    "Fn::GetAtt": [
      "Queue381943A6",
      "Arn"
    ]
  }
};

test("consumer-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler"
  });
  expect(stack).toCountResources('AWS::Lambda::Function', 1);
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
  });
  expect(stack).toCountResources('AWS::SQS::Queue', 1);
  expect(stack).toHaveResource('AWS::SQS::Queue', {
    QueueName: "dev-my-app-Queue",
  });
});

test("consumer-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Queue(stack, "Queue", {
    consumer: f
  });
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource('AWS::SQS::Queue', {
    QueueName: "dev-my-app-Queue",
  });
});

test("consumer-FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Queue(stack, "Queue", {
    consumer: { handler: "test/lambda.handler" }
  });
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource('AWS::SQS::Queue', {
    QueueName: "dev-my-app-Queue",
  });
});

test("consumer-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore
    new Queue(stack, "Queue", {
    });
  }).toThrow(/No consumer defined/);
});

test("sqsQueue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new sqs.Queue(stack, "Q", {
    queueName: 'my-queue',
  });
  new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
    sqsQueue: queue,
  });
  expect(stack).toCountResources('AWS::Lambda::Function', 1);
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
  });
  expect(stack).toCountResources('AWS::SQS::Queue', 1);
  expect(stack).toHaveResource('AWS::SQS::Queue', {
    QueueName: "my-queue",
  });
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue", {
    consumer: "test/lambda.handler",
  });
  queue.attachPermissions([ FunctionPermissionType.S3 ]);
  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        queueDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17"
    },
    PolicyName: "QueueConsumerServiceRoleDefaultPolicy8A09B9BC",
  });
});

