/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-types, @typescript-eslint/no-empty-function */
import { test, expect, beforeEach } from "vitest";
import {
  ANY,
  countResources,
  hasResource,
  objectLike,
  arrayWith,
  countResourcesLike,
} from "./helper";
import { App, Stack, Job, Config, Topic } from "../src";
import { Vpc } from "aws-cdk-lib/aws-ec2";

test("constructor: default", async () => {
  const stack = new Stack(new App(), "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::CodeBuild::Project", 1);
  hasResource(stack, "AWS::CodeBuild::Project", {
    Name: "dev-my-app-Job",
    Environment: {
      ComputeType: "BUILD_GENERAL1_SMALL",
      EnvironmentVariables: [
        objectLike({ Name: "SST_APP", Value: "my-app" }),
        objectLike({ Name: "SST_STAGE", Value: "dev" }),
      ],
      Image: "amazon/aws-lambda-nodejs:16",
      Type: "LINUX_CONTAINER",
    },
    TimeoutInMinutes: 480,
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        PROJECT_NAME: { Ref: "JobJobProject946AC8CC" },
      },
    },
  });
});

test("constructor: timeout", async () => {
  const stack = new Stack(new App(), "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    timeout: "1 hour",
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    TimeoutInMinutes: 60,
  });
});

test("constructor: timeout: invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Job(stack, "Job", {
      handler: "test/lambda.handler",
      timeout: "5 seconds",
    });
  }).toThrow(/Invalid timeout/);
});

test("constructor: memorySize", async () => {
  const stack = new Stack(new App(), "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    memorySize: "15 GB",
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      ComputeType: "BUILD_GENERAL1_LARGE",
    },
  });
});

test("constructor: memorySize: invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Job(stack, "Job", {
      handler: "test/lambda.handler",
      // @ts-ignore Allow type casting
      memorySize: "1024 MB",
    });
  }).toThrow(/Invalid memory size/);
});

test("constructor: bind", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
  });
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    bind: [MY_TOPIC_ARN],
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "SST_Parameter_value_MY_TOPIC_ARN", Value: ANY }),
      ]),
    },
  });
});

test("constructor: config", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
  });
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    config: [MY_TOPIC_ARN],
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "SST_Parameter_value_MY_TOPIC_ARN", Value: ANY }),
      ]),
    },
  });
});

test("constructor: permissions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    permissions: [topic],
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "sns:*" })]),
    }),
  });
});

test("constructor: environment", async () => {
  const stack = new Stack(new App(), "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    environment: {
      DEBUG: "*",
    },
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "DEBUG", Value: "*" }),
      ]),
    },
  });
});

test("sst deploy", async () => {
  const app = new App();
  const stack = new Stack(app, "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  // Invoker needs to call CodeBuild on `sst start`
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "codebuild:StartBuild" })]),
    }),
  });
});

test("sst start", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  // Invoker not calling CodeBuild on `sst start`
  countResourcesLike(stack, "AWS::IAM::Policy", 0, {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "codebuild:StartBuild" })]),
    }),
  });
});

test("sst start: enableLiveDev false", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    enableLiveDev: false,
  });
  // Invoker not calling CodeBuild on `sst start`
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "codebuild:StartBuild" })]),
    }),
  });
});

test("bind", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
  });
  const job = new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  job.bind([MY_TOPIC_ARN]);
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "SST_Parameter_value_MY_TOPIC_ARN", Value: ANY }),
      ]),
    },
  });
});

test("addConfig", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
  });
  const job = new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  job.addConfig([MY_TOPIC_ARN]);
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "SST_Parameter_value_MY_TOPIC_ARN", Value: ANY }),
      ]),
    },
  });
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  const job = new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  job.attachPermissions([topic]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "sns:*" })]),
    }),
  });
});

test("addEnvironment", async () => {
  const stack = new Stack(new App(), "stack");
  const job = new Job(stack, "Job", {
    handler: "test/lambda.handler",
  });
  job.addEnvironment("DEBUG", "*");
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "DEBUG", Value: "*" }),
      ]),
    },
  });
});

test("vpc", async () => {
  const stack = new Stack(new App(), "stack");
  new Job(stack, "Job", {
    handler: "test/lambda.handler",
    timeout: "1 hour",
    cdk: {
      vpc: new Vpc(stack, "VPC"),
    },
  });
  hasResource(stack, "AWS::EC2::VPC", {});
});
