/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-empty-function */

import "@aws-cdk/assert/jest";
import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as sns from "@aws-cdk/aws-sns";
import { ABSENT } from "@aws-cdk/assert";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import {
  Api,
  AppSyncApi,
  WebSocketApi,
  ApiGatewayV1Api,
  App,
  Stack,
  Table,
  TableFieldType,
  Bucket,
  Function,
  HandlerProps,
  FunctionProps,
  FunctionHandlerProps,
  PermissionType,
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test constructor
/////////////////////////////

test("non-namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as HandlerProps;
  expect(handlerProps).toBeDefined();
});

test("namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as FunctionHandlerProps;
  expect(handlerProps).toBeDefined();
});

test("constructor-is-props-with-minimum-config", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 10,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
  expect(stack).toCountResources("AWS::Lambda::EventInvokeConfig", 0);
});

test("constructor-is-props-with-full-config", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
    memorySize: 512,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 20,
    MemorySize: 512,
  });
});

test("constructor-handler-missing", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {});
  }).toThrow(/No handler defined/);
});

test("srcPath-missing-python", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.PYTHON_3_8,
    });
  }).toThrow(/Cannot set the "srcPath" to the project root/);
});

test("srcPath-project-root-python", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      srcPath: ".",
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.PYTHON_3_8,
    });
  }).toThrow(/Cannot set the "srcPath" to the project root/);
});

test("runtime-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    runtime: "nodejs10.x",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Runtime: "nodejs10.x",
  });
});

test("runtime-string-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: "java8",
    });
  }).toThrow(/The specified runtime is not supported/);
});

test("runtime-class", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    runtime: lambda.Runtime.NODEJS_10_X,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Runtime: "nodejs10.x",
  });
});

test("runtime-class-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.JAVA_11,
    });
  }).toThrow(/The specified runtime is not supported/);
});

test("timeout-number", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 15,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Timeout: 15,
  });
});

test("timeout-class", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: cdk.Duration.seconds(15),
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Timeout: 15,
  });
});

test("xray-disabled", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: lambda.Tracing.DISABLED,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    TracingConfig: ABSENT,
  });
});

test("permissions", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    permissions: ["s3", "dynamodb:Get"],
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: debugIncreaseTimeout true", async () => {
  const app = new App({
    synthCallback: () => {},
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
    debugIncreaseTimeout: true,
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Timeout: 900,
  });
  expect(stack).toHaveResource("AWS::Lambda::EventInvokeConfig", {
    MaximumRetryAttempts: 0,
  });
});

test("constructor: debugIncreaseTimeout false", async () => {
  const app = new App({
    synthCallback: () => {},
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
    debugIncreaseTimeout: false,
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Timeout: 10,
  });
  expect(stack).toHaveResource("AWS::Lambda::EventInvokeConfig", {
    MaximumRetryAttempts: 0,
  });
});

/////////////////////////////
// Test attachPermissions - generic
/////////////////////////////

test("attachPermission-string-all", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions(PermissionType.ALL);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
  });
});

test("attachPermission-string-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    f.attachPermissions("abc" as PermissionType.ALL);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermission-array-empty", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
  });
});

test("attachPermission-array-string", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions(["s3", "dynamodb:Get"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-array-sst-api", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
                "arn:aws:execute-api:us-east-1:",
                { Ref: "AWS::AccountId" },
                ":",
                { Ref: "ApiCD79AAA0" },
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

test("attachPermission-array-sst-ApiGatewayV1Api", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
                "arn:aws:execute-api:us-east-1:",
                { Ref: "AWS::AccountId" },
                ":",
                { Ref: "ApiCD79AAA0" },
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

test("attachPermission-array-sst-AppSyncApi", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: { "Query notes": "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "appsync:GraphQL",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:aws:appsync:us-east-1:",
                { Ref: "AWS::AccountId" },
                ":apis/",
                { "Fn::GetAtt": ["ApiCD79AAA0", "ApiId"] },
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

test("attachPermission-array-sst-WebSocketApi", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: { $connect: "test/lambda.handler" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([api]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
                "arn:aws:execute-api:us-east-1:",
                { Ref: "AWS::AccountId" },
                ":",
                { Ref: "ApiCD79AAA0" },
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

test("attachPermission-array-sst-function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "functionA", {
    handler: "test/lambda.handler",
  });
  const f2 = new Function(stack, "functionB", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([f2]);

  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-array-sst-bucket", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);

  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-array-cfn-construct-sns", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([topic]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-array-cfn-construct-s3", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new s3.Bucket(stack, "Bucket");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([bucket]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-array-cfn-construct-table", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: {
      id: TableFieldType.STRING,
    },
    primaryIndex: { partitionKey: "id" },
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([table]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-array-cfn-construct-not-supported", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new apig.HttpApi(stack, "Api");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    f.attachPermissions([api]);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermission-array-cfn-grant", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([[topic, "grantPublish"]]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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

test("attachPermission-policy-statement", async () => {
  const stack = new Stack(new App(), "stack");
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
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
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
    srcPath: "path",
  };
  const props = {
    timeout: 10,
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    timeout: 10,
    srcPath: "path",
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
    Function.mergeProps(
      { permissions: PermissionType.ALL },
      { permissions: PermissionType.ALL }
    )
  ).toEqual({ permissions: PermissionType.ALL });

  expect(
    Function.mergeProps(
      { permissions: ["s3"] },
      { permissions: PermissionType.ALL }
    )
  ).toEqual({ permissions: PermissionType.ALL });

  expect(
    Function.mergeProps(
      { permissions: PermissionType.ALL },
      { permissions: ["s3"] }
    )
  ).toEqual({ permissions: PermissionType.ALL });

  expect(
    Function.mergeProps({ permissions: ["s3"] }, { permissions: ["dynamodb"] })
  ).toEqual({ permissions: ["s3", "dynamodb"] });
});

test("mergeProps-bundle", async () => {
  // base props {}
  expect(Function.mergeProps({}, {})).toEqual({});

  expect(Function.mergeProps({}, { bundle: true })).toEqual({ bundle: true });

  expect(Function.mergeProps({}, { bundle: false })).toEqual({ bundle: false });

  expect(Function.mergeProps({}, { bundle: { nodeModules: [] } })).toEqual({
    bundle: { nodeModules: [] },
  });

  // base props { bundle: true }
  expect(Function.mergeProps({ bundle: true }, {})).toEqual({ bundle: true });

  expect(Function.mergeProps({ bundle: true }, { bundle: true })).toEqual({
    bundle: true,
  });

  expect(Function.mergeProps({ bundle: true }, { bundle: false })).toEqual({
    bundle: false,
  });

  expect(
    Function.mergeProps({ bundle: true }, { bundle: { nodeModules: [] } })
  ).toEqual({ bundle: { nodeModules: [] } });

  // base props { bundle: false }
  expect(Function.mergeProps({ bundle: false }, {})).toEqual({ bundle: false });

  expect(Function.mergeProps({ bundle: false }, { bundle: true })).toEqual({
    bundle: true,
  });

  expect(Function.mergeProps({ bundle: false }, { bundle: false })).toEqual({
    bundle: false,
  });

  expect(
    Function.mergeProps({ bundle: false }, { bundle: { nodeModules: [] } })
  ).toEqual({ bundle: { nodeModules: [] } });

  // base props { bundle: false }
  expect(Function.mergeProps({ bundle: { externalModules: [] } }, {})).toEqual({
    bundle: { externalModules: [] },
  });

  expect(
    Function.mergeProps({ bundle: { externalModules: [] } }, { bundle: true })
  ).toEqual({ bundle: true });

  expect(
    Function.mergeProps({ bundle: { externalModules: [] } }, { bundle: false })
  ).toEqual({ bundle: false });

  expect(
    Function.mergeProps(
      { bundle: { externalModules: [] } },
      { bundle: { nodeModules: [] } }
    )
  ).toEqual({ bundle: { nodeModules: [] } });
});

/////////////////////////////
// Test app defaultFunctionProps
/////////////////////////////

test("app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
});

test("app-defaultFunctionProps-calledTwice", async () => {
  const app = new App();
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
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
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

test("app-defaultFunctionProps-callback", async () => {
  const app = new App();
  app.setDefaultFunctionProps(() => ({
    timeout: 15,
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
});

test("app-defaultFunctionProps-callback-calledTwice", async () => {
  const app = new App();
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
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
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

test("app-defaultFunctionProps-override", async () => {
  const app = new App();
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
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
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
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 10,
  });
});

test("fromDefinition-string-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048,
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 15,
    MemorySize: 2048,
  });
});

test("fromDefinition-string-inherit", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 20,
  });
});

test("fromDefinition-string-inherit-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048,
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20,
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 20,
    MemorySize: 2048,
  });
});

test("fromDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
});

test("fromDefinition-props-inherit", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    {
      handler: "test/lambda.handler",
      memorySize: 2048,
      environment: { KEY_A: "a" },
    },
    {
      runtime: lambda.Runtime.NODEJS_10_X,
      memorySize: 512,
      environment: { KEY_B: "b" },
    }
  );
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Runtime: "nodejs10.x",
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
  const app = new App();
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
      runtime: lambda.Runtime.NODEJS_10_X,
      memorySize: 512,
      environment: { KEY_C: "c" },
    }
  );
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Runtime: "nodejs10.x",
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
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      timeout: 20,
    })
  );
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 20,
  });
});

test("fromDefinition-sstFunction-inherit", async () => {
  const stack = new Stack(new App(), "stack");
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    Function.fromDefinition(
      stack,
      "Function",
      new lambda.Function(stack, "Function", {
        runtime: lambda.Runtime.NODEJS_10_X,
        handler: "lambda.handler",
        code: lambda.Code.fromAsset("test"),
      }) as Function
    );
  }).toThrow(
    /Please use sst.Function instead of lambda.Function for the "Function" Function./
  );
});

test("fromDefinition-garbage", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    Function.fromDefinition(stack, "Function", {} as FunctionProps);
  }).toThrow(/Invalid function definition for the "Function" Function/);
});
