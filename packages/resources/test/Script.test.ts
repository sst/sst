/* eslint-disable @typescript-eslint/ban-ts-comment*/

import {
  expect as expectCdk,
  countResources,
  haveResource,
  anything,
} from "@aws-cdk/assert";
import { App, Stack, Script, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

/////////////////////////////
// Test Constructor
/////////////////////////////

test("function: is string", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    function: "test/lambda.handler",
  });
  expect(script.function._isLiveDevEnabled).toBeFalsy();
  expectCdk(stack).to(countResources("Custom::SSTScript", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTScript", {
      ServiceToken: {
        "Fn::GetAtt": ["ScriptScriptHandlerC33CFA9A", "Arn"],
      },
      UserFunction: { Ref: "ScriptFunctionCB81908A" },
      UserParams: "{}",
      BuiltAt: anything(),
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 900,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "index.handler",
      Timeout: 900,
    })
  );
});

test("function: is Function: liveDebug enabled", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  expect(() => {
    new Script(stack, "Script", {
      function: f,
    });
  }).toThrow(
    /Live Lambda Dev cannot be enabled for functions in the Script construct./
  );
});

test("function: is Function: liveDebug disabled", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
    enableLiveDev: false,
  });
  const script = new Script(stack, "Script", {
    function: f,
  });
  expect(script.function._isLiveDevEnabled).toBeFalsy();
  expectCdk(stack).to(countResources("Custom::SSTScript", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 20,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "index.handler",
      Timeout: 900,
    })
  );
});

test("function: is FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    function: {
      handler: "test/lambda.handler",
      timeout: 20,
      enableLiveDev: true,
    },
  });
  expect(script.function._isLiveDevEnabled).toBeFalsy();
  expectCdk(stack).to(countResources("Custom::SSTScript", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
      Timeout: 20,
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "index.handler",
      Timeout: 900,
    })
  );
});

test("function: is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore: Testing for deprecated consumers property
    new Script(stack, "Script", {});
  }).toThrow(/No function defined for the "Script" Script/);
});

test("params: is props", async () => {
  const stack = new Stack(new App(), "stack");
  new Script(stack, "Script", {
    function: "test/lambda.handler",
    params: {
      hello: "world",
    },
  });
  expectCdk(stack).to(countResources("Custom::SSTScript", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTScript", {
      UserParams: '{"hello":"world"}',
    })
  );
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
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
    function: "test/lambda.handler",
  });
  expectCdk(stack).to(countResources("Custom::SSTScript", 1));
  expectCdk(stack).to(
    haveResource("Custom::SSTScript", {
      BuiltAt: 123,
    })
  );
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const script = new Script(stack, "Script", {
    function: "test/lambda.handler",
  });
  script.attachPermissions(["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "ScriptFunctionServiceRoleDefaultPolicy5AD174AA",
    })
  );
});
