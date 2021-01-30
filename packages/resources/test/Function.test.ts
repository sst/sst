import '@aws-cdk/assert/jest';
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as sns from "@aws-cdk/aws-sns";
import * as lambda from "@aws-cdk/aws-lambda";
import { App, Stack, Function, HandlerProps, FunctionPermissionType, FunctionHandlerProps } from "../src";

const lambdaDefaultPolicy = {
  Action: [
    "xray:PutTraceSegments",
    "xray:PutTelemetryRecords"
  ],
  Effect: "Allow",
  Resource: "*"
};

test("non-namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as HandlerProps;
  expect(handlerProps).toBeDefined();
});

test("namespaced-props", async () => {
  const handlerProps = { srcPath: "a", handler: "b" } as FunctionHandlerProps;
  expect(handlerProps).toBeDefined();
});

test("base", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
    Timeout: 10,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
  });
});

test("base-override", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
    memorySize: 512,
  });
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
    Timeout: 20,
    MemorySize: 512,
  });
});

test("handler-missing", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {});
  }).toThrow(/No handler defined/);
});

test("runtime-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: lambda.Runtime.PYTHON_3_8,
    });
  }).toThrow(/The specified runtime is not supported/);
});

test("xray-disabled", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: lambda.Tracing.DISABLED,
  });
  expect((f.node?.defaultChild as any).tracingConfig).toBeUndefined();
});

test("attachPermission-string-all", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions(FunctionPermissionType.ALL);
  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17"
    },
  });
});

test("attachPermission-string-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(() => {
    f.attachPermissions("abc" as FunctionPermissionType);
  }).toThrow(/The specified permissions is not a supported FunctionPermissionType/);
});

test("attachPermission-array-empty", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([]);
  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [ lambdaDefaultPolicy ],
      Version: "2012-10-17"
    },
  });
});

test("attachPermission-array-string", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([ FunctionPermissionType.S3, FunctionPermissionType.DynamoDB ]);
  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17"
    },
  });
});

test("attachPermission-array-cfn-construct", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([ topic ]);
  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "sns:*", Effect: "Allow", Resource: { "Ref": "TopicBFC7AF6E" } },
      ],
      Version: "2012-10-17"
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
    f.attachPermissions([ api ]);
  }).toThrow(/The specified permissions is not a supported construct type/);
});

test("attachPermission-array-cfn-grant", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  f.attachPermissions([ topic.grantPublish.bind(topic) ]);
  expect(stack).toHaveResource('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "sns:Publish", Effect: "Allow", Resource: { Ref: "TopicBFC7AF6E" } },
      ],
      Version: "2012-10-17"
    },
  });
});

test("fromDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  const f = Function.fromDefinition(stack, "Function", "test/lambda.handler");
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
    Timeout: 10,
  });
});

test("fromDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  const f = Function.fromDefinition(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
  });
});

test("fromDefinition-sstFunction", async () => {
  const stack = new Stack(new App(), "stack");
  const f = Function.fromDefinition(stack, "Function", new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
  }));
  expect(stack).toHaveResource('AWS::Lambda::Function', {
    Handler: "test/lambda.handler",
    Timeout: 20,
  });
});

test("fromDefinition-lambdaFunction", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore
    Function.fromDefinition(stack, "Function", new lambda.Function(stack, "Function", {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: "lambda.handler",
      code: lambda.Code.fromAsset('test'),
    }));
  }).toThrow(/Please use sst.Function instead of lambda.Function for the \"Function\" Function./);
});

test("fromDefinition-garbage", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore
    Function.fromDefinition(stack, "Function", { });
  }).toThrow(/Invalid function definition for the \"Function\" Function/);
});

