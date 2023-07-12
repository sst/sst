/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-types, @typescript-eslint/no-empty-function */
import { test, expect, beforeEach } from "vitest";
import {
  ANY,
  countResources,
  hasResource,
  objectLike,
  arrayWith,
  countResourcesLike,
  createApp,
  stringLike,
  stringNotLike,
} from "./helper";
import {
  App,
  Stack,
  Job,
  Config,
  Topic,
  JobProps,
} from "../../dist/constructs/";
import { Vpc, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";

type JobOptions = Omit<JobProps, "handler"> & {
  handler?: string;
};

async function createJob(props?: JobOptions | ((stack: Stack) => JobOptions)) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const job = new Job(stack, "Job", {
    handler: "test/constructs/lambda.handler",
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, job };
}

test("constructor: default", async () => {
  const { stack } = await createJob();
  countResources(stack, "AWS::CodeBuild::Project", 1);
  hasResource(stack, "AWS::CodeBuild::Project", {
    Name: "test-app-Job",
    Environment: {
      ComputeType: "BUILD_GENERAL1_SMALL",
      EnvironmentVariables: [
        objectLike({ Name: "SST_APP", Value: "app" }),
        objectLike({ Name: "SST_STAGE", Value: "test" }),
        objectLike({
          Name: "SST_SSM_PREFIX",
          Type: "PLAINTEXT",
          Value: "/test/test/",
        }),
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
        SST_JOB_PROVIDER: "codebuild",
        SST_JOB_RUNNER: { Ref: "JobJobProject946AC8CC" },
      },
    },
  });
});

test("timeout", async () => {
  const { stack } = await createJob({
    timeout: "1 hour",
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    TimeoutInMinutes: 60,
  });
});

test("timeout: invalid", async () => {
  expect(async () => {
    await createJob({
      timeout: "5 seconds",
    });
  }).rejects.toThrow(/Invalid timeout/);
});

test("runtime: nodejs", async () => {
  const { stack } = await createJob({
    runtime: "nodejs",
    timeout: "1 hour",
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: objectLike({
      Image: "amazon/aws-lambda-nodejs:16",
    }),
  });
});

test("runtime: container", async () => {
  const { stack } = await createJob({
    runtime: "container",
    handler: "test/constructs/container-function",
    timeout: "1 hour",
    container: {
      cmd: ["echo", "hello"],
    },
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: objectLike({
      Image: { "Fn::Sub": ANY },
    }),
    Source: {
      BuildSpec: stringLike(/echo hello/),
    },
  });
});

test("runtime: container: cmd with space", async () => {
  const { stack } = await createJob({
    runtime: "container",
    handler: "test/constructs/container-function",
    container: {
      cmd: ["echo", "hello world"],
    },
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: objectLike({
      Image: { "Fn::Sub": ANY },
    }),
    Source: {
      BuildSpec: stringLike(/echo "hello world"/),
    },
  });
});

test("runtime: container: no cmd", async () => {
  expect(async () => {
    await createJob({
      runtime: "container",
      handler: "test/constructs/container-function",
    });
  }).rejects.toThrow(/No commands/);
});

test("constructor: memorySize", async () => {
  const { stack } = await createJob({
    memorySize: "15 GB",
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      ComputeType: "BUILD_GENERAL1_LARGE",
    },
  });
});

test("constructor: memorySize: invalid", async () => {
  expect(async () => {
    await createJob({
      // @ts-ignore Allow type casting
      memorySize: "1024 MB",
    });
  }).rejects.toThrow(/Invalid memory size/);
});

test("constructor: bind", async () => {
  const { stack } = await createJob((stack) => {
    const topic = new Topic(stack, "Topic");
    const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
      value: topic.topicArn,
    });
    return {
      bind: [MY_TOPIC_ARN],
    };
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
  const { stack } = await createJob((stack) => {
    const topic = new Topic(stack, "Topic");
    return {
      permissions: [topic],
    };
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "sns:*" })]),
    }),
  });
});

test("constructor: environment", async () => {
  const { stack } = await createJob({
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

test("constructor: cdk.vpc", async () => {
  const { stack } = await createJob((stack) => {
    return {
      timeout: "1 hour",
      cdk: {
        vpc: new Vpc(stack, "VPC"),
      },
    };
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Name: "test-app-Job",
    VpcConfig: {
      VpcId: { Ref: "VPCB9E5F0B4" },
      SecurityGroupIds: [
        { "Fn::GetAtt": ["JobJobProjectSecurityGroup600AA2AD", "GroupId"] },
      ],
      Subnets: [
        { Ref: "VPCPrivateSubnet1Subnet8BCA10E0" },
        { Ref: "VPCPrivateSubnet2SubnetCFCDAA7A" },
        { Ref: "VPCPrivateSubnet3Subnet3EDCD457" },
      ],
    },
  });
});

test("constructor: cdk.vpcSubnets", async () => {
  const { stack } = await createJob((stack) => {
    return {
      timeout: "1 hour",
      cdk: {
        vpc: new Vpc(stack, "VPC"),
        vpcSubnets: {
          subnetType: SubnetType.PUBLIC,
        },
      },
    };
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Name: "test-app-Job",
    VpcConfig: {
      VpcId: { Ref: "VPCB9E5F0B4" },
      SecurityGroupIds: [
        { "Fn::GetAtt": ["JobJobProjectSecurityGroup600AA2AD", "GroupId"] },
      ],
      Subnets: [
        { Ref: "VPCPublicSubnet1SubnetB4246D30" },
        { Ref: "VPCPublicSubnet2Subnet74179F39" },
        { Ref: "VPCPublicSubnet3Subnet631C5E25" },
      ],
    },
  });
});

test("constructor: cdk.securityGroups", async () => {
  const { stack } = await createJob((stack) => {
    return {
      timeout: "1 hour",
      cdk: {
        vpc: new Vpc(stack, "VPC"),
        securityGroups: [
          SecurityGroup.fromSecurityGroupId(stack, "SecurityGroup", "sg-123"),
        ],
      },
    };
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Name: "test-app-Job",
    VpcConfig: {
      VpcId: { Ref: "VPCB9E5F0B4" },
      SecurityGroupIds: ["sg-123"],
      Subnets: [
        { Ref: "VPCPrivateSubnet1Subnet8BCA10E0" },
        { Ref: "VPCPrivateSubnet2SubnetCFCDAA7A" },
        { Ref: "VPCPrivateSubnet3Subnet3EDCD457" },
      ],
    },
  });
});

test("sst deploy", async () => {
  const app = await createApp({
    mode: "deploy",
  });
  const stack = new Stack(app, "stack");
  new Job(stack, "Job", {
    handler: "test/constructs/lambda.handler",
  });
  await app.finish();
  // Invoker needs to call CodeBuild on `sst start`
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: objectLike({
      Statement: arrayWith([
        objectLike({
          Action: ["codebuild:StartBuild", "codebuild:StopBuild"],
        }),
      ]),
    }),
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Source: objectLike({
      BuildSpec: stringLike(/node handler-wrapper.mjs/),
    }),
  });
});

test("sst deploy: inactive stack", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return false;
    },
  });
  const stack = new Stack(app, "stack");
  new Job(stack, "Job", {
    handler: "test/constructs/lambda.handler",
  });
  await app.finish();
  // Invoker needs to call CodeBuild on `sst start`
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: objectLike({
      Statement: arrayWith([
        objectLike({
          Action: ["codebuild:StartBuild", "codebuild:StopBuild"],
        }),
      ]),
    }),
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Source: objectLike({
      BuildSpec: stringNotLike(/node handler-wrapper.mjs/),
    }),
  });
});

test("sst remove", async () => {
  const app = await createApp({
    mode: "remove",
  });
  const stack = new Stack(app, "stack");
  new Job(stack, "Job", {
    handler: "test/constructs/lambda.handler",
  });
  await app.finish();
  // Invoker not calling CodeBuild on `sst start`
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: objectLike({
      Statement: arrayWith([
        objectLike({
          Action: ["codebuild:StartBuild", "codebuild:StopBuild"],
        }),
      ]),
    }),
  });
  hasResource(stack, "AWS::CodeBuild::Project", {
    Source: objectLike({
      BuildSpec: stringNotLike(/node handler-wrapper.mjs/),
    }),
  });
});

test("bind", async () => {
  const { stack, job } = await createJob();
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
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
  const { stack, job } = await createJob();
  const topic = new Topic(stack, "Topic");
  const MY_TOPIC_ARN = new Config.Parameter(stack, "MY_TOPIC_ARN", {
    value: topic.topicArn,
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

test("attachPermissions", async () => {
  const { stack, job } = await createJob();
  const topic = new Topic(stack, "Topic");
  job.attachPermissions([topic]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: objectLike({
      Statement: arrayWith([objectLike({ Action: "sns:*" })]),
    }),
  });
});

test("addEnvironment", async () => {
  const { stack, job } = await createJob();
  job.addEnvironment("DEBUG", "*");
  hasResource(stack, "AWS::CodeBuild::Project", {
    Environment: {
      EnvironmentVariables: arrayWith([
        objectLike({ Name: "DEBUG", Value: "*" }),
      ]),
    },
  });
});
