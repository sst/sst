import { test, expect } from "vitest";
/* eslint-disable @typescript-eslint/ban-ts-comment*/

import { countResources, countResourcesLike, hasResource, ANY } from "./helper";
import { App, Stack, Script, ScriptProps, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test Constructor
/////////////////////////////

test("function: is deprecated", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Script(stack, "Script", {
      function: "test/lambda.handler",
    } as any as ScriptProps);
  }).toThrow(
    /The "function" property has been replaced by "onCreate" and "onUpdate"./
  );
});

test("onCreate: missing", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Script(stack, "Script", {});
  }).toThrow(/Need to provide at least one/);
});

test("onCreate: onUpdate and onDelete not set", async () => {
  const stack = new Stack(new App(), "stack");
  new Script(stack, "Script", {
    onCreate: "test/lambda.handler",
  });
  countResources(stack, "Custom::SSTScript", 1);
  hasResource(stack, "Custom::SSTScript", {
    ServiceToken: {
      "Fn::GetAtt": ["ScriptScriptHandlerC33CFA9A", "Arn"],
    },
    UserCreateFunction: { Ref: "ScriptonCreateFunction86002BE3" },
    UserParams: "{}",
    BuiltAt: ANY,
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Handler: "test/lambda.handler",
    Timeout: 900,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.handler",
    Timeout: 900,
  });
});

test("onCreate: is string", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    onCreate: "test/lambda.handler",
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
  });
  expect(script.createFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.updateFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.deleteFunction?._isLiveDevEnabled).toBeFalsy();
  countResources(stack, "Custom::SSTScript", 1);
  hasResource(stack, "Custom::SSTScript", {
    ServiceToken: {
      "Fn::GetAtt": ["ScriptScriptHandlerC33CFA9A", "Arn"],
    },
    UserCreateFunction: { Ref: "ScriptonCreateFunction86002BE3" },
    UserUpdateFunction: { Ref: "ScriptonUpdateFunctionC0351409" },
    UserDeleteFunction: { Ref: "ScriptonDeleteFunction83C52A89" },
    UserParams: "{}",
    BuiltAt: ANY,
  });
  countResources(stack, "AWS::Lambda::Function", 4);
  countResourcesLike(stack, "AWS::Lambda::Function", 3, {
    Handler: "test/lambda.handler",
    Timeout: 900,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.handler",
    Timeout: 900,
  });
});

test("onCreate: is Function: liveDebug enabled", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  expect(() => {
    new Script(stack, "Script", {
      onCreate: f,
      onUpdate: "test/lambda.handler",
      onDelete: "test/lambda.handler",
    });
  }).toThrow(
    /Live Lambda Dev cannot be enabled for functions in the Script construct./
  );
});

test("onCreate: is Function: liveDebug disabled", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
    enableLiveDev: false,
  });
  const script = new Script(stack, "Script", {
    onCreate: f,
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
  });
  expect(script.createFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.updateFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.deleteFunction?._isLiveDevEnabled).toBeFalsy();
  countResources(stack, "Custom::SSTScript", 1);
  countResources(stack, "AWS::Lambda::Function", 4);
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Handler: "test/lambda.handler",
    Timeout: 20,
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
    Timeout: 900,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.handler",
    Timeout: 900,
  });
});

test("onCreate: is Function: liveDebug enabled", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    enableLiveDev: false,
  });
  expect(() => {
    new Script(stack, "Script", {
      defaults: {
        function: {
          timeout: 3,
        },
      },
      onCreate: f,
      onUpdate: "test/lambda.handler",
      onDelete: "test/lambda.handler",
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("onCreate: is FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    onCreate: {
      handler: "test/lambda.handler",
      timeout: 20,
      enableLiveDev: true,
    },
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
  });
  expect(script.createFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.updateFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.deleteFunction?._isLiveDevEnabled).toBeFalsy();
  countResources(stack, "Custom::SSTScript", 1);
  countResources(stack, "AWS::Lambda::Function", 4);
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Handler: "test/lambda.handler",
    Timeout: 20,
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
    Timeout: 900,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.handler",
    Timeout: 900,
  });
});

test("onCreate: with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    defaults: {
      function: {
        timeout: 3,
        enableLiveDev: true,
      },
    },
    onCreate: {
      handler: "test/lambda.handler",
      timeout: 20,
    },
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
  });
  expect(script.createFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.updateFunction?._isLiveDevEnabled).toBeFalsy();
  expect(script.deleteFunction?._isLiveDevEnabled).toBeFalsy();
  countResources(stack, "Custom::SSTScript", 1);
  countResources(stack, "AWS::Lambda::Function", 4);
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Handler: "test/lambda.handler",
    Timeout: 20,
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "index.handler",
    Timeout: 900,
  });
});

test("params: is props", async () => {
  const stack = new Stack(new App(), "stack");
  new Script(stack, "Script", {
    onCreate: "test/lambda.handler",
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
    params: {
      hello: "world",
    },
  });
  countResources(stack, "Custom::SSTScript", 1);
  hasResource(stack, "Custom::SSTScript", {
    UserParams: '{"hello":"world"}',
  });
  countResources(stack, "AWS::Lambda::Function", 4);
});

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: debugIncreaseTimeout true: visibilityTimeout not set", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
    debugStartedAt: 123,
    debugIncreaseTimeout: true,
  });
  const stack = new Stack(app, "stack");
  new Script(stack, "Script", {
    onCreate: "test/lambda.handler",
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
  });
  countResources(stack, "Custom::SSTScript", 1);
  hasResource(stack, "Custom::SSTScript", {
    BuiltAt: 123,
  });
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    onCreate: "test/lambda.handler",
    onUpdate: "test/lambda.handler",
    onDelete: "test/lambda.handler",
  });
  script.attachPermissions(["s3"]);
  countResourcesLike(stack, "AWS::IAM::Policy", 3, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: ANY,
  });
});

test("attachPermissions: onUpdate and onDelete not set", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    onCreate: "test/lambda.handler",
  });
  script.attachPermissions(["s3"]);
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: ANY,
  });
});
