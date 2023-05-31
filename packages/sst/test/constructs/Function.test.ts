import { test, expect, beforeEach, beforeAll } from "vitest";
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-types, @typescript-eslint/no-empty-function */

import path from "path";
import {
  countResources,
  countResourcesLike,
  hasResource,
  stringLike,
  ABSENT,
  createApp,
} from "./helper";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import {
  Api,
  AppSyncApi,
  WebSocketApi,
  ApiGatewayV1Api,
  App,
  Job,
  RDS,
  Stack,
  Table,
  Bucket,
  Config,
  EventBus,
  Function,
  FunctionProps,
} from "../../dist/constructs";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test constructor
/////////////////////////////

test("handlerPath: entry", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
  });
  await app.finish();
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.handler",
  });
});

test("constructor: props with minimum config", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 10,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
  countResources(stack, "AWS::Lambda::EventInvokeConfig", 0);
});

test("constructor: props with full config", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
    timeout: 20,
    memorySize: 512,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 20,
    MemorySize: 512,
  });
});

test("constructor: props without handler", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new Function(stack, "Function", {});
  }).toThrow(/No handler defined/);
});

test("constructor: props disabling live development ", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    enableLiveDev: false,
    handler: "test/constructs/lambda.handler",
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 0, {
    Environment: {
      Variables: {
        SST_DEBUG_SRC_PATH: ".",
        SST_DEBUG_SRC_HANDLER: "test/constructs/lambda.handler",
        SST_DEBUG_ENDPOINT: "placeholder",
        SST_DEBUG_BUCKET_NAME: "placeholder",
        SST_FUNCTION_ID: "02056f69",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("constructor: liveDev prop defaults to true", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {},
    },
  });
});

test("constructor: handler is jsx", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda-jsx.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 1);
});

test("constructor: handler not exist", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/random.handler",
  });
  await expect(async () => {
    await app.finish();
  }).rejects.toThrow(/Could not find file for handler "test\/random.handler"/);
});

test("functionName: undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    FunctionName: ABSENT,
  });
});

test("functionName: string", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    functionName: "my-fn-name",
    handler: "test/constructs/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    FunctionName: "my-fn-name",
  });
});

test("functionName: callback", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    functionName: ({ functionProps, stack }) =>
      `${stack.stackName}-${path.parse(functionProps.handler!).name}`,
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    FunctionName: "test-app-stack-lambda",
  });
});

test("copyFiles", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    copyFiles: [{ from: "test/lambda.js", to: "test/lambda.js" }],
  });
});

test("copyFiles infer to", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    copyFiles: [{ from: "test/lambda.js" }],
  });
});

test("copyFiles absolute to", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
    copyFiles: [{ from: "test/lambda.js", to: "/test/fail.js" }],
  });
  await expect(async () => {
    await app.finish();
  }).rejects.toThrow(/Copy destination path/);
});

test("copyFiles nonexistent", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
    copyFiles: [{ from: "test/fail.js", to: "test/fail.js" }],
  });
  await expect(async () => {
    await app.finish();
  }).rejects.toThrow(/no such file/);
});

test("runtime-string", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
    runtime: "nodejs10.x",
  });
  await app.finish();
  hasResource(stack, "AWS::Lambda::Function", {
    Runtime: "nodejs10.x",
  });
});

test("runtime-string-invalid", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/constructs/lambda.handler",
    runtime: "ruby" as any,
  });
  await expect(async () => {
    await app.finish();
  }).rejects.toThrow(/runtime/);
});

test("timeout-number", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 15,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 15,
  });
});

test("timeout-Duration", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: "15 seconds",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 15,
  });
});

test("memorySize-number", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    memorySize: 2048,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    MemorySize: 2048,
  });
});

test("memorySize-Size", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    memorySize: "2 GB",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    MemorySize: 2048,
  });
});

test("diskSize-number", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    diskSize: 2048,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    EphemeralStorage: {
      Size: 2048,
    },
  });
});

test("diskSize-Size", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    diskSize: "2 GB",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    EphemeralStorage: {
      Size: 2048,
    },
  });
});

test("logRetention-undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  countResources(stack, "Custom::LogRetention", 0);
});

test("logRetention-one-week", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    logRetention: "one_week",
  });
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: 7,
  });
});

test("logRetention-infinite", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    logRetention: "infinite",
  });
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: ABSENT,
  });
});

test("xray-disabled", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: "disabled",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    TracingConfig: ABSENT,
  });
});

test("constructor: bind", async () => {
  const stack = new Stack(await createApp(), "stack");
  const s = new Config.Secret(stack, "MY_SECRET");
  const p = new Config.Parameter(stack, "MY_PARAM", {
    value: "value",
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [s, p],
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        SST_Secret_value_MY_SECRET: "__FETCH_FROM_SSM__",
        SST_Parameter_value_MY_PARAM: "value",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("constructor: config", async () => {
  const stack = new Stack(await createApp(), "stack");
  const s = new Config.Secret(stack, "MY_SECRET");
  const s2 = new Config.Secret(stack, "MY_SECRET2");
  const p = new Config.Parameter(stack, "MY_PARAM", {
    value: "value",
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [s, s2, p],
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        SST_Secret_value_MY_SECRET: "__FETCH_FROM_SSM__",
        SST_Secret_value_MY_SECRET2: "__FETCH_FROM_SSM__",
        SST_Parameter_value_MY_PARAM: "value",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET2/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET2/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("permissions", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    permissions: ["s3", "dynamodb:Get"],
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:Get", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("bundle: commandHooks-beforeBundling success", async () => {
  const stack = new Stack(await createApp(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    hooks: {
      afterBuild: async () => {},
      beforeBuild: async () => {},
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
});

test("url: undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(fn.url).toBeUndefined();
  countResources(stack, "AWS::Lambda::Url", 0);
});

test("url: true", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: true,
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "NONE",
    Cors: {
      AllowHeaders: ["*"],
      AllowMethods: ["*"],
      AllowOrigins: ["*"],
    },
  });
});

test("url.authorizer: undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {},
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "NONE",
  });
});

test("url.authorizer: none", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      authorizer: "none",
    },
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "NONE",
  });
});

test("url.authorizer: iam", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      authorizer: "iam",
    },
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "AWS_IAM",
  });
});

test("url.cors: undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {},
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: {
      AllowHeaders: ["*"],
      AllowMethods: ["*"],
      AllowOrigins: ["*"],
    },
  });
});

test("url.cors: true", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: true,
    },
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: {
      AllowHeaders: ["*"],
      AllowMethods: ["*"],
      AllowOrigins: ["*"],
    },
  });
});

test("url.cors: false", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: false,
    },
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: ABSENT,
  });
});

test("url.cors: props", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: {
        allowMethods: ["GET"],
        allowOrigins: ["https://example.com"],
      },
    },
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: {
      AllowHeaders: ["*"],
      AllowMethods: ["GET"],
      AllowOrigins: ["https://example.com"],
    },
  });
});

test("url.cors: allowMethods *", async () => {
  const stack = new Stack(await createApp(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: {
        allowMethods: ["*"],
      },
    },
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: {
      AllowMethods: ["*"],
    },
  });
});

test("layers: imported from another stack", async () => {
  const app = await createApp();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = new lambda.LayerVersion(stack1, "MyLayer", {
    code: lambda.Code.fromAsset("test"),
  });
  new Function(stack1, "f1", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "f2", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  expect(stack2.dependencies).toEqual([stack1]);

  countResourcesLike(stack1, "AWS::SSM::Parameter", 1, {
    Value: { Ref: stringLike(/MyLayer.*/) },
  });
  countResources(stack1, "AWS::Lambda::LayerVersion", 1);
  hasResource(stack1, "AWS::Lambda::Function", {
    Layers: [{ Ref: stringLike(/MyLayer.*/) }],
  });

  countResources(stack2, "AWS::Lambda::LayerVersion", 0);
  hasResource(stack2, "AWS::Lambda::Function", {
    Layers: [{ Ref: stringLike(/SsmParameterValue.*/) }],
  });
});

test("layers: imported from another stack multiple times", async () => {
  const app = await createApp();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = new lambda.LayerVersion(stack1, "MyLayer", {
    code: lambda.Code.fromAsset("test"),
  });
  new Function(stack1, "f1", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "f2", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "f3", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  countResourcesLike(stack1, "AWS::SSM::Parameter", 1, {
    Value: { Ref: stringLike(/MyLayer.*/) },
  });
  countResources(stack1, "AWS::Lambda::LayerVersion", 1);
  hasResource(stack1, "AWS::Lambda::Function", {
    Layers: [{ Ref: stringLike(/MyLayer.*/) }],
  });

  countResources(stack2, "AWS::Lambda::LayerVersion", 0);
  countResourcesLike(stack2, "AWS::Lambda::Function", 2, {
    Layers: [{ Ref: stringLike(/SsmParameterValue.*/) }],
  });
});

test("layers: imported from ARN", async () => {
  const app = await createApp();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = lambda.LayerVersion.fromLayerVersionArn(
    stack1,
    "MyLayer",
    "arn"
  );
  new Function(stack1, "f1", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  new Function(stack2, "f2", {
    handler: "test/lambda.handler",
    layers: [layer],
  });
  countResourcesLike(stack1, "AWS::SSM::Parameter", 0, {
    Value: { Ref: stringLike(/MyLayer.*/) },
  });
  countResources(stack1, "AWS::Lambda::LayerVersion", 0);
  hasResource(stack1, "AWS::Lambda::Function", {
    Layers: ["arn"],
  });

  countResourcesLike(stack2, "AWS::SSM::Parameter", 0, {
    Value: { Ref: stringLike(/MyLayer.*/) },
  });
  countResources(stack2, "AWS::Lambda::LayerVersion", 0);
  hasResource(stack2, "AWS::Lambda::Function", {
    Layers: ["arn"],
  });
});

test("vpc: securityGroups configured without vpc", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      securityGroups: [
        new ec2.SecurityGroup(stack, "sg", {
          vpc: new ec2.Vpc(stack, "vpc"),
        }),
      ],
    });
  }).toThrow(/Cannot configure "securityGroups"/);
});
/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: sst deploy: inactive stack", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return false;
    },
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    description: "identifier",
  });
  await app.finish();
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Description: "identifier",
  });
});

test("constructor: sst remove", async () => {
  const app = await createApp({
    mode: "remove",
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    description: "identifier",
  });
  await app.finish();
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Description: "identifier",
  });
});

/////////////////////////////
// Test functions
/////////////////////////////

test("attachPermissions: string: all", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions("*");
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: string: invalid", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    // @ts-ignore Allow type casting
    f.attachPermissions("abc" as Permissions);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermissions: array: empty", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: string", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions(["s3", "dynamodb:Get"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:Get", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sst Api", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "execute-api:Invoke",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition",
                },
                ":execute-api:us-east-1:my-account:",
                {
                  Ref: "ApiCD79AAA0",
                },
                "/*",
              ],
            ],
          },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sst WebSocketApi", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: { $connect: "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "execute-api:ManageConnections",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition",
                },
                ":execute-api:us-east-1:my-account:",
                {
                  Ref: "ApiCD79AAA0",
                },
                "/*/*/@connections/*",
              ],
            ],
          },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sst Function", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "functionA", {
    handler: "test/lambda.handler",
  });
  const f2 = new Function(stack, "functionB", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([f2]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "lambda:*",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["functionB93D70A66", "Arn"] },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sst Bucket", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: [
            { "Fn::GetAtt": ["bucketBucketF19722A9", "Arn"] },
            {
              "Fn::Join": [
                "",
                [{ "Fn::GetAtt": ["bucketBucketF19722A9", "Arn"] }, "/*"],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sst EventBus", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bus = new EventBus(stack, "bus");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bus]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "events:*",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["busEventBus27CE599B", "Arn"] },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sst Job", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  const job = new Job(stack, "job", {
    handler: "test/lambda.handler",
  });
  f.bind([job]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "lambda:*",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["job867F7ADB", "Arn"] },
        },
      ],
      Version: "2012-10-17",
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        SST_APP: "app",
        SST_STAGE: "test",
        SST_Job_functionName_job: { Ref: "job867F7ADB" },
      },
    },
  });
});

test("attachPermissions: array: sst RDS", async () => {
  const stack = new Stack(await createApp(), "stack");
  const cluster = new RDS(stack, "cluster", {
    engine: "postgresql11.13",
    defaultDatabaseName: "acme",
  });
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([cluster]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "rds-data:*",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  Ref: "AWS::Partition",
                },
                ":rds:us-east-1:my-account:cluster:",
                {
                  Ref: "clusterCluster4486A143",
                },
              ],
            ],
          },
        },
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
          ],
          Effect: "Allow",
          Resource: {
            Ref: "clusterClusterSecretAttachment92A36E7C",
          },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sns topic", async () => {
  const stack = new Stack(await createApp(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([topic]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "sns:*",
          Effect: "Allow",
          Resource: { Ref: "TopicBFC7AF6E" },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: sns topic imported", async () => {
  const stack = new Stack(await createApp(), "stack");
  const topicArn = "arn:aws:sns:us-east-1:123:topic";
  const topic = sns.Topic.fromTopicArn(stack, "Topic", topicArn);
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([topic]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "sns:*",
          Effect: "Allow",
          Resource: topicArn,
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: s3 bucket", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bucket = new s3.Bucket(stack, "Bucket");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: [
            { "Fn::GetAtt": ["Bucket83908E77", "Arn"] },
            {
              "Fn::Join": [
                "",
                [{ "Fn::GetAtt": ["Bucket83908E77", "Arn"] }, "/*"],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: s3 bucket imported", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bucket = s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "s3:*",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":s3:::my-bucket",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":s3:::my-bucket/*",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: dynamodb table", async () => {
  const stack = new Stack(await createApp(), "stack");
  const table = new Table(stack, "Table", {
    fields: {
      id: "string",
    },
    primaryIndex: { partitionKey: "id" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([table]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "dynamodb:*",
          Effect: "Allow",
          Resource: [
            { "Fn::GetAtt": ["Table710B521B", "Arn"] },
            {
              "Fn::Join": [
                "",
                [{ "Fn::GetAtt": ["Table710B521B", "Arn"] }, "/*"],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: array: cfn construct not supported", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new apig.HttpApi(stack, "Api");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    f.attachPermissions([api]);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermissions: array: cfn construct grant", async () => {
  const stack = new Stack(await createApp(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([[topic, "grantPublish"]]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "sns:Publish",
          Effect: "Allow",
          Resource: { Ref: "TopicBFC7AF6E" },
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermissions: policy statement", async () => {
  const stack = new Stack(await createApp(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([
    new iam.PolicyStatement({
      actions: ["s3:*"],
      resources: ["*"],
      effect: iam.Effect.ALLOW,
    }),
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("addConfig", async () => {
  const stack = new Stack(await createApp(), "stack");
  const s = new Config.Secret(stack, "MY_SECRET");
  const s2 = new Config.Secret(stack, "MY_SECRET2");
  const p = new Config.Parameter(stack, "MY_PARAM", {
    value: "value",
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [s, p],
  });
  f.bind([s2]);
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        SST_Secret_value_MY_SECRET: "__FETCH_FROM_SSM__",
        SST_Secret_value_MY_SECRET2: "__FETCH_FROM_SSM__",
        SST_Parameter_value_MY_PARAM: "value",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET2/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET2/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("bind", async () => {
  const stack = new Stack(await createApp(), "stack");
  const s = new Config.Secret(stack, "MY_SECRET");
  const s2 = new Config.Secret(stack, "MY_SECRET2");
  const p = new Config.Parameter(stack, "MY_PARAM", {
    value: "value",
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [s, p],
  });
  f.bind([s2]);
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        SST_Secret_value_MY_SECRET: "__FETCH_FROM_SSM__",
        SST_Secret_value_MY_SECRET2: "__FETCH_FROM_SSM__",
        SST_Parameter_value_MY_PARAM: "value",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/MY_SECRET2/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/MY_SECRET2/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

/////////////////////////////
// Test mergeProps
/////////////////////////////

test("mergeProps", async () => {
  const baseProps = {
    timeout: 5,
  };
  const props = {
    timeout: 10,
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    timeout: 10,
  });
});

test("mergeProps-environment", async () => {
  const baseProps = {
    environment: {
      keyA: "valueA",
      keyB: "valueB",
    },
  };
  const props = {
    environment: {
      keyB: "valueB2",
      keyC: "valueC",
    },
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    environment: {
      keyA: "valueA",
      keyB: "valueB2",
      keyC: "valueC",
    },
  });
});

test("mergeProps-permissions", async () => {
  expect(
    Function.mergeProps({ permissions: "*" }, { permissions: "*" })
  ).toEqual({ permissions: "*" });

  expect(
    Function.mergeProps({ permissions: ["s3"] }, { permissions: "*" })
  ).toEqual({ permissions: "*" });

  expect(
    Function.mergeProps({ permissions: "*" }, { permissions: ["s3"] })
  ).toEqual({ permissions: "*" });

  expect(
    Function.mergeProps({ permissions: ["s3"] }, { permissions: ["dynamodb"] })
  ).toEqual({ permissions: ["s3", "dynamodb"] });
});

test("mergeProps-bind", async () => {
  const stack = new Stack(await createApp(), "stack");
  const bucketA = new Bucket(stack, "bucketA");
  const bucketB = new Bucket(stack, "bucketB");
  expect(Function.mergeProps({ bind: [bucketA] }, { bind: [bucketB] })).toEqual(
    { bind: [bucketA, bucketB] }
  );
});

test("mergeProps-layers", async () => {
  const stack = new Stack(await createApp(), "stack");
  const layer1Arn = "arn:aws:lambda:us-east-1:123:layer:my-layer:1";
  const layer2Arn = "arn:aws:lambda:us-east-1:123:layer:my-layer:2";
  const layer1 = lambda.LayerVersion.fromLayerVersionArn(
    stack,
    "Layer1",
    layer1Arn
  );
  const layer2 = lambda.LayerVersion.fromLayerVersionArn(
    stack,
    "Layer2",
    layer2Arn
  );
  expect(
    Function.mergeProps({ layers: [layer1] }, { layers: [layer2] })
  ).toEqual({ layers: [layer1, layer2] });
});

/////////////////////////////
// Test defaultFunctionProps
/////////////////////////////

test("Stack.defaultFunctionProps()", async () => {
  const app = await createApp();

  const stack = new Stack(app, "stack");
  stack.setDefaultFunctionProps({
    timeout: 15,
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
});

test("Stack.defaultFunctionProps(): after Function resource", async () => {
  const app = await createApp();
  const stack = new Stack(app, "Stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    stack.setDefaultFunctionProps({
      timeout: 10,
    });
  }).toThrowError();
});

test("Stack.defaultFunctionProps(): after non-Function resource", async () => {
  const app = await createApp();
  const stack = new Stack(app, "Stack");
  new Bucket(stack, "Bucket");
  stack.setDefaultFunctionProps({
    timeout: 15,
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 15,
  });
});

test("Stack.defaultFunctionProps(): env", async () => {
  const app = await createApp();

  const stack = new Stack(app, "stack");
  stack.addDefaultFunctionEnv({ keyA: "valueA" });
  stack.addDefaultFunctionEnv({ keyB: "valueB" });
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("Stack.defaultFunctionProps(): permissions", async () => {
  const app = await createApp();

  const stack = new Stack(app, "stack");
  stack.addDefaultFunctionPermissions(["s3"]);
  stack.addDefaultFunctionPermissions(["dynamodb"]);
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("Stack.defaultFunctionProps(): bind", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const SECRET_A = new Config.Secret(stack, "SECRET_A");
  const SECRET_B = new Config.Secret(stack, "SECRET_B");
  const SECRET_C = new Config.Secret(stack, "SECRET_C");
  stack.setDefaultFunctionProps({
    bind: [SECRET_A],
  });
  stack.addDefaultFunctionBinding([SECRET_B]);
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [SECRET_C],
  });

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_A/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_A/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_B/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_B/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_C/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_C/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("App.defaultFunctionProps()", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    timeout: 15,
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
});

test("App.defaultFunctionProps(): calledTwice", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 256,
    environment: { keyA: "valueA" },
  });
  app.setDefaultFunctionProps({
    timeout: 10,
    environment: { keyB: "valueB" },
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 10,
    MemorySize: 256,
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
    TracingConfig: { Mode: "Active" },
  });
});

test("App.defaultFunctionProps(): after Stack without Function resource", async () => {
  const app = await createApp();
  new Stack(app, "Stack");
  expect(() => {
    app.setDefaultFunctionProps({
      timeout: 10,
    });
  }).not.toThrowError();
});

test("App.defaultFunctionProps(): env", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    environment: { keyA: "valueA" },
  });
  app.addDefaultFunctionEnv({ keyB: "valueB" });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("App.defaultFunctionProps(): permissions", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    permissions: ["s3"],
  });
  app.addDefaultFunctionPermissions(["dynamodb"]);

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("App.defaultFunctionProps(): config", async () => {
  const app = await createApp();
  // Create a stack with 1 secret
  const stackA = new Stack(app, "stackA");
  const SECRET_A = new Config.Secret(stackA, "SECRET_A");
  app.setDefaultFunctionProps({
    bind: [SECRET_A],
  });

  // Create another stack with 1 secret
  const stackB = new Stack(app, "stackB");
  const SECRET_B = new Config.Secret(stackB, "SECRET_B");
  app.addDefaultFunctionBinding([SECRET_B]);

  // Test function's config is merged with default config
  const stack = new Stack(app, "stack");
  const SECRET_C = new Config.Secret(stack, "SECRET_C");
  stack.addDefaultFunctionBinding([SECRET_C]);
  const SECRET_D = new Config.Secret(stack, "SECRET_D");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [SECRET_D],
  });

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_A/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_A/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_B/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_B/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_C/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_C/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_D/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_D/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("App.defaultFunctionProps(): bind", async () => {
  const app = await createApp();
  // Create a stack with 1 secret
  const stackA = new Stack(app, "stackA");
  const SECRET_A = new Config.Secret(stackA, "SECRET_A");
  app.setDefaultFunctionProps({
    bind: [SECRET_A],
  });

  // Create another stack with 1 secret
  const stackB = new Stack(app, "stackB");
  const SECRET_B = new Config.Secret(stackB, "SECRET_B");
  app.addDefaultFunctionBinding([SECRET_B]);

  // Test function's bind is merged with default bind
  const stack = new Stack(app, "stack");
  const SECRET_C = new Config.Secret(stack, "SECRET_C");
  stack.addDefaultFunctionBinding([SECRET_C]);
  const SECRET_D = new Config.Secret(stack, "SECRET_D");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bind: [SECRET_D],
  });

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_A/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_A/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_B/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_B/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_C/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_C/value",
                ],
              ],
            },
          ],
        },
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/test/test/Secret/SECRET_D/value",
                ],
              ],
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition",
                  },
                  ":ssm:us-east-1:my-account:parameter/sst/app/.fallback/Secret/SECRET_D/value",
                ],
              ],
            },
          ],
        },
      ],
      Version: "2012-10-17",
    },
  });
});

test("App.defaultFunctionProps(): callback", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps(() => ({
    timeout: 15,
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
});

test("App.defaultFunctionProps(): callback-calledTwice", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps(() => ({
    timeout: 15,
    memorySize: 256,
    environment: { keyA: "valueA" },
  }));
  app.setDefaultFunctionProps(() => ({
    timeout: 10,
    environment: { keyB: "valueB" },
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 10,
    MemorySize: 256,
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
    TracingConfig: { Mode: "Active" },
  });
});

test("App.defaultFunctionProps(): override", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    timeout: 15,
    environment: { keyA: "valueA" },
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 10,
    environment: { keyB: "valueB" },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 10,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

/////////////////////////////
// Test fromDefinition
/////////////////////////////

test("fromDefinition-string", async () => {
  const stack = new Stack(await createApp(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 10,
  });
});

test("fromDefinition-string-with-app-defaultFunctionProps", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048,
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 15,
    MemorySize: 2048,
  });
});

test("fromDefinition-string-inherit", async () => {
  const stack = new Stack(await createApp(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 20,
  });
});

test("fromDefinition-string-inherit-with-app-defaultFunctionProps", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048,
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 20,
    MemorySize: 2048,
  });
});

test("fromDefinition-props", async () => {
  const stack = new Stack(await createApp(), "stack");
  Function.fromDefinition(stack, "Function", {
    handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
  });
});

test("fromDefinition-props-inherit", async () => {
  const stack = new Stack(await createApp(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    {
      handler: "test/lambda.handler",
      memorySize: 2048,
      environment: { KEY_A: "a" },
    },
    {
      runtime: "nodejs16.x",
      memorySize: 512,
      environment: { KEY_B: "b" },
    }
  );
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Runtime: "nodejs16.x",
    MemorySize: 2048,
    Environment: {
      Variables: {
        KEY_A: "a",
        KEY_B: "b",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("fromDefinition-props-inherit-with-app-defaultFunctionProps", async () => {
  const app = await createApp();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 1024,
    environment: { KEY_A: "a" },
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(
    stack,
    "Function",
    {
      handler: "test/lambda.handler",
      memorySize: 2048,
      environment: { KEY_B: "b" },
    },
    {
      runtime: "nodejs16.x",
      memorySize: 512,
      environment: { KEY_C: "c" },
    }
  );
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Runtime: "nodejs16.x",
    Timeout: 15,
    MemorySize: 2048,
    Environment: {
      Variables: {
        KEY_A: "a",
        KEY_B: "b",
        KEY_C: "c",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
});

test("fromDefinition-sstFunction", async () => {
  const stack = new Stack(await createApp(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      timeout: 20,
    })
  );
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.placeholder",
    Timeout: 20,
  });
});

test("fromDefinition-sstFunction-inherit", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    Function.fromDefinition(
      stack,
      "Function",
      new Function(stack, "Function", {
        handler: "test/lambda.handler",
        timeout: 20,
      }),
      { timeout: 10 },
      "Cannot inherit"
    );
  }).toThrow(/Cannot inherit/);
});

test("fromDefinition-lambdaFunction", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    Function.fromDefinition(
      stack,
      "Function",
      new lambda.Function(stack, "Function", {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: "test/lambda.handler",
        code: lambda.Code.fromAsset("test"),
      }) as Function
    );
  }).toThrow();
});

test("fromDefinition-garbage", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    Function.fromDefinition(stack, "Function", {} as FunctionProps);
  }).toThrow(/Invalid function definition for the "Function" Function/);
});
