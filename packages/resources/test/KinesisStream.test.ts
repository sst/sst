import { test, expect } from "vitest";
import { countResources, hasResource } from "./helper";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import { App, Stack, Function, KinesisStream } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test constructor
/////////////////////////////

test("cdk.stream is props", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream", {
    cdk: {
      stream: {
        shardCount: 3,
      },
    },
  });
  expect(stream.streamArn).toBeDefined();
  expect(stream.streamName).toBeDefined();
  hasResource(stack, "AWS::Kinesis::Stream", {
    Name: "dev-my-app-Stream",
    ShardCount: 3,
    RetentionPeriodHours: 24,
    StreamEncryption: {
      "Fn::If": [
        "AwsCdkKinesisEncryptedStreamsUnsupportedRegions",
        { Ref: "AWS::NoValue" },
        {
          EncryptionType: "KMS",
          KeyId: "alias/aws/kinesis",
        },
      ],
    },
  });
});

test("cdk.stream is construct from the same stack", async () => {
  const stack = new Stack(new App(), "stack");
  const kinesisStream = new kinesis.Stream(stack, "KinesisStream", {
    streamName: "MyStream",
  });
  const stream = new KinesisStream(stack, "Stream", {
    cdk: { stream: kinesisStream },
  });
  expect(stream.streamArn).toBeDefined();
  expect(stream.streamName).toBeDefined();
  countResources(stack, "AWS::Kinesis::Stream", 1);
  hasResource(stack, "AWS::Kinesis::Stream", {
    Name: "MyStream",
  });
});

test("cdk.stream is construct from another stack", async () => {
  const app = new App();
  const stack0 = new Stack(app, "stack0");
  const stack = new Stack(app, "stack");
  const kinesisStream = new kinesis.Stream(stack0, "KinesisStream", {
    streamName: "MyStream",
  });
  const stream = new KinesisStream(stack, "Stream", {
    cdk: { stream: kinesisStream },
  });
  expect(stream.streamArn).toBeDefined();
  expect(stream.streamName).toBeDefined();
  countResources(stack0, "AWS::Kinesis::Stream", 1);
  countResources(stack, "AWS::Kinesis::Stream", 0);
});

test("cdk.stream is imported", async () => {
  const stack = new Stack(new App(), "stack");
  const streamArn = "arn:aws:kinesis:us-east-1:123:stream/dev-Stream";
  const stream = new KinesisStream(stack, "Stream", {
    cdk: {
      stream: kinesis.Stream.fromStreamArn(stack, "IStream", streamArn),
    },
  });
  expect(stream.streamArn).toBeDefined();
  expect(stream.streamName).toBeDefined();
  countResources(stack, "AWS::Kinesis::Stream", 0);
});

/////////////////////////////
// Test consumers
/////////////////////////////

test("consumers: no consumers", async () => {
  const stack = new Stack(new App(), "stack");
  new KinesisStream(stack, "Stream");
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 0);
});

test("consumers: empty consumers", async () => {
  const stack = new Stack(new App(), "stack");
  new KinesisStream(stack, "Stream", { consumers: {} });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 0);
});

test("consumers: 1 function string", async () => {
  const stack = new Stack(new App(), "stack");
  new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    FunctionName: { Ref: "StreamConsumerStreamconsumerAD4C1E7A4" },
    BatchSize: 100,
    EventSourceArn: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
    StartingPosition: "LATEST",
  });
});

test("consumers: 1 function string with defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new KinesisStream(stack, "Stream", {
    defaults: {
      function: {
        timeout: 3,
      },
    },
    consumers: {
      consumerA: "test/lambda.handler",
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("consumers: multi function string", async () => {
  const stack = new Stack(new App(), "stack");
  new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
      consumerB: "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 2);
});

test("consumers: function construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: f,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
});

test("consumers: function construct with defaultFunctionProps", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  const f = new Function(stack, "F", { handler: "test/lambda.handler" });
  expect(() => {
    new KinesisStream(stack, "Stream", {
      consumers: {
        consumerA: f,
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("consumers: consumer props (override startingPosition)", async () => {
  const stack = new Stack(new App(), "stack");
  new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: {
        function: "test/lambda.handler",
        cdk: {
          eventSource: {
            startingPosition: lambda.StartingPosition.TRIM_HORIZON,
          },
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stack, "AWS::Lambda::EventSourceMapping", {
    StartingPosition: "TRIM_HORIZON",
  });
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("addConsumers", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
    },
  });
  stream.addConsumers(stack, {
    consumerB: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "AWS::Lambda::EventSourceMapping", 2);
});

test("getFunction", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
    },
  });
  expect(stream.getFunction("consumerA")).toBeDefined();
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
      consumerB: "test/lambda.handler",
    },
  });
  stream.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: [
            "kinesis:DescribeStreamSummary",
            "kinesis:GetRecords",
            "kinesis:GetShardIterator",
            "kinesis:ListShards",
            "kinesis:SubscribeToShard",
            "kinesis:DescribeStream",
            "kinesis:ListStreams",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        {
          Action: "kinesis:DescribeStream",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "StreamConsumerStreamconsumerAServiceRoleDefaultPolicyB55D1B9A",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: [
            "kinesis:DescribeStreamSummary",
            "kinesis:GetRecords",
            "kinesis:GetShardIterator",
            "kinesis:ListShards",
            "kinesis:SubscribeToShard",
            "kinesis:DescribeStream",
            "kinesis:ListStreams",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        {
          Action: "kinesis:DescribeStream",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "StreamConsumerStreamconsumerBServiceRoleDefaultPolicy1DDF5ED5",
  });
});

test("attachPermissionsToConsumer", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
      consumerB: "test/lambda.handler",
    },
  });
  stream.attachPermissionsToConsumer("consumerA", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: [
            "kinesis:DescribeStreamSummary",
            "kinesis:GetRecords",
            "kinesis:GetShardIterator",
            "kinesis:ListShards",
            "kinesis:SubscribeToShard",
            "kinesis:DescribeStream",
            "kinesis:ListStreams",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        {
          Action: "kinesis:DescribeStream",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "StreamConsumerStreamconsumerAServiceRoleDefaultPolicyB55D1B9A",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: [
            "kinesis:DescribeStreamSummary",
            "kinesis:GetRecords",
            "kinesis:GetShardIterator",
            "kinesis:ListShards",
            "kinesis:SubscribeToShard",
            "kinesis:DescribeStream",
            "kinesis:ListStreams",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        {
          Action: "kinesis:DescribeStream",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "StreamConsumerStreamconsumerBServiceRoleDefaultPolicy1DDF5ED5",
  });
});

test("attachPermissionsToConsumer consumer not found", async () => {
  const stack = new Stack(new App(), "stack");
  const stream = new KinesisStream(stack, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
      consumerB: "test/lambda.handler",
    },
  });
  expect(() => {
    stream.attachPermissionsToConsumer("consumerC", ["s3"]);
  }).toThrow(
    /The "consumerC" consumer was not found in the "Stream" KinesisStream/
  );
});

test("attachPermissions-after-addConsumers", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const stream = new KinesisStream(stackA, "Stream", {
    consumers: {
      consumerA: "test/lambda.handler",
    },
  });
  stream.attachPermissions(["s3"]);
  stream.addConsumers(stackB, {
    consumerB: "test/lambda.handler",
  });
  countResources(stackA, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: [
            "kinesis:DescribeStreamSummary",
            "kinesis:GetRecords",
            "kinesis:GetShardIterator",
            "kinesis:ListShards",
            "kinesis:SubscribeToShard",
            "kinesis:DescribeStream",
            "kinesis:ListStreams",
          ],
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        {
          Action: "kinesis:DescribeStream",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["Stream862536A4", "Arn"] },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "StreamConsumerStreamconsumerAServiceRoleDefaultPolicyB55D1B9A",
  });
  countResources(stackB, "AWS::Lambda::EventSourceMapping", 1);
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: [
            "kinesis:DescribeStreamSummary",
            "kinesis:GetRecords",
            "kinesis:GetShardIterator",
            "kinesis:ListShards",
            "kinesis:SubscribeToShard",
            "kinesis:DescribeStream",
            "kinesis:ListStreams",
          ],
          Effect: "Allow",
          Resource: {
            "Fn::ImportValue":
              "dev-my-app-stackA:ExportsOutputFnGetAttStream862536A4Arn22664C11",
          },
        },
        {
          Action: "kinesis:DescribeStream",
          Effect: "Allow",
          Resource: {
            "Fn::ImportValue":
              "dev-my-app-stackA:ExportsOutputFnGetAttStream862536A4Arn22664C11",
          },
        },
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "ConsumerStreamconsumerBServiceRoleDefaultPolicy3AA16A6B",
  });
});
