import { test, expect, beforeEach } from "vitest";
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-types, @typescript-eslint/no-empty-function */

import path from "path";
import {
  countResources,
  countResourcesLike,
  hasResource,
  stringLike,
  ANY,
  ABSENT
} from "./helper";
import * as s3 from "aws-cdk-lib/aws-s3";
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
  RDS,
  Stack,
  Table,
  Bucket,
  Config,
  EventBus,
  Function,
  FunctionProps
} from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*"
};

beforeEach(async () => {
  Config.Parameter.clear();
  Config.Secret.clear();
});

/////////////////////////////
// Test constructor
/////////////////////////////

test("handlerPath: entry + no src", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler"
  });
});

test("handlerPath: no entry + src", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "lambda.handler",
    srcPath: "test/nested"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/nested/lambda.handler"
  });
});

test("handlerPath: entry + src", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "nested/lambda.handler",
    srcPath: "test"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/nested/lambda.handler"
  });
});

test("constructor: props with minimum config", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" }
  });
  countResources(stack, "AWS::Lambda::EventInvokeConfig", 0);
});

test("constructor: props with full config", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 20,
    memorySize: 512
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 20,
    MemorySize: 512
  });
});

test("constructor: props without handler", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {});
  }).toThrow(/No handler defined/);
});

test("constructor: props disabling live development ", async () => {
  const stack = new Stack(
    new App({
      debugEndpoint: "placeholder",
      debugBucketArn: "placeholder",
      debugBucketName: "placeholder"
    }),
    "stack"
  );
  new Function(stack, "Function", {
    enableLiveDev: false,
    handler: "test/lambda.handler"
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 0, {
    Environment: {
      Variables: {
        SST_DEBUG_SRC_PATH: ".",
        SST_DEBUG_SRC_HANDLER: "test/lambda.handler",
        SST_DEBUG_ENDPOINT: "placeholder",
        SST_DEBUG_BUCKET_NAME: "placeholder",
        SST_FUNCTION_ID: "02056f69",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("constructor: liveDev prop defaults to true", async () => {
  const stack = new Stack(
    new App({
      debugEndpoint: "placeholder",
      debugBucketArn: "placeholder",
      debugBucketName: "placeholder"
    }),
    "stack"
  );
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        SST_DEBUG_SRC_PATH: ".",
        SST_DEBUG_SRC_HANDLER: "test/lambda.handler",
        SST_DEBUG_ENDPOINT: "placeholder",
        SST_DEBUG_BUCKET_NAME: "placeholder",
        SST_FUNCTION_ID: "dev-my-app-stack-Function",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("constructor: handler is jsx", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda-jsx.handler"
  });
  countResources(stack, "AWS::Lambda::Function", 1);
});

test("constructor: handler not exist", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/random.handler"
    });
  }).toThrow(/Cannot find a handler file for "test\/random.handler"/);
});

test("constructor: node: srcPath absolute path", async () => {
  const stack = new Stack(new App(), "stack");
  const srcPath = path.resolve(".");
  new Function(stack, "Function", {
    srcPath,
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: `test/lambda.handler`
  });
});

test("constructor: python: srcPath not set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: "python3.8"
    });
  }).toThrow(/Cannot set the "srcPath" to the project root/);
});

test("constructor: python: srcPath is project root", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      srcPath: ".",
      handler: "test/lambda.handler",
      runtime: "python3.8"
    });
  }).toThrow(/Cannot set the "srcPath" to the project root/);
});

test("functionName: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    FunctionName: ABSENT
  });
});

test("functionName: string", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    functionName: "my-fn-name",
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    FunctionName: "my-fn-name"
  });
});

test("functionName: callback", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    functionName: ({ functionProps, stack }) =>
      `${stack.stackName}-${path.parse(functionProps.handler!).name}`,
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    FunctionName: "dev-my-app-stack-lambda"
  });
});

test("copyFiles", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      copyFiles: [{ from: "test/lambda.js", to: "test/lambda.js" }]
    }
  });
});

test("copyFiles infer to", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      copyFiles: [{ from: "test/lambda.js" }]
    }
  });
});

test("copyFiles absolute to", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        copyFiles: [{ from: "test/lambda.js", to: "/test/fail.js" }]
      }
    });
  }).toThrow(/Copy destination path/);
});

test("copyFiles nonexistent", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        copyFiles: [{ from: "test/fail.js", to: "test/fail.js" }]
      }
    });
  }).toThrow(/Tried to copy nonexistent file/);
});

test("runtime-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    runtime: "nodejs10.x"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Runtime: "nodejs10.x"
  });
});

test("runtime-string-invalid", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      runtime: "java8" as any
    });
  }).toThrow(/The specified runtime is not supported/);
});

test("timeout-number", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 15
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 15
  });
});

test("timeout-Duration", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: "15 seconds"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 15
  });
});

test("memorySize-number", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    memorySize: 2048
  });
  hasResource(stack, "AWS::Lambda::Function", {
    MemorySize: 2048
  });
});

test("memorySize-Size", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    memorySize: "2 GB"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    MemorySize: 2048
  });
});

test("diskSize-number", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    diskSize: 2048
  });
  hasResource(stack, "AWS::Lambda::Function", {
    EphemeralStorage: {
      Size: 2048
    }
  });
});

test("diskSize-Size", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    diskSize: "2 GB"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    EphemeralStorage: {
      Size: 2048
    }
  });
});

test("logRetention-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  countResources(stack, "Custom::LogRetention", 0);
});

test("logRetention-one-week", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    logRetention: "one_week",
  });
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: 7,
  });
});

test("logRetention-infinite", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    logRetention: "infinite",
  });
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: ABSENT,
  });
});

test("xray-disabled", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    tracing: "disabled"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    TracingConfig: ABSENT
  });
});

test("config", async () => {
  const stack = new Stack(new App(), "stack");
  const s = new Config.Secret(stack, "MY_SECRET");
  const p = new Config.Parameter(stack, "MY_PARAM", {
    value: "value"
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    config: [s, p]
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        SST_SECRET_MY_SECRET: "1",
        SST_PARAM_MY_PARAM: "value",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "ssm:GetParameters",
          Effect: "Allow",
          Resource: [
            "arn:aws:ssm:us-east-1:my-account:parameter/sst/my-app/dev/*",
            "arn:aws:ssm:us-east-1:my-account:parameter/sst/my-app/.fallback/*",
          ],
        },
      ],
      Version: "2012-10-17"
    }
  });
});

test("permissions", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    permissions: ["s3", "dynamodb:Get"]
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:Get", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    }
  });
});

test("bundle.esbuildConfig is object", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      esbuildConfig: {
        plugins: "test/function/esbuild-config.cjs",
        keepNames: true
      }
    }
  });
  countResources(stack, "AWS::Lambda::Function", 1);
});

test("bundle.esbuildConfig is object: error invalid plugin", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        esbuildConfig: {
          plugins: "test/function/esbuild-config-invalid.js",
          keepNames: true
        }
      }
    });
  }).toThrow(/There was a problem transpiling the Lambda handler./);
});

test("bundle: commandHooks-beforeBundling success", async () => {
  const stack = new Stack(new App(), "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    bundle: {
      commandHooks: {
        beforeBundling: (): string[] => {
          return ["echo beforeBundling"];
        },
        beforeInstall: (): string[] => {
          return [];
        },
        afterBundling: (): string[] => {
          return [];
        }
      }
    }
  });
  countResources(stack, "AWS::Lambda::Function", 1);
});

test("bundle: commandHooks-beforeBundling failed", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      bundle: {
        commandHooks: {
          beforeBundling: (): string[] => {
            return ["non-exist-command"];
          },
          beforeInstall: (): string[] => {
            return [];
          },
          afterBundling: (): string[] => {
            return [];
          }
        }
      }
    });
  }).toThrow();
});

test("url: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
  });
  expect(fn.url).toBeUndefined();
  countResources(stack, "AWS::Lambda::Url", 0);
});

test("url: true", async () => {
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: true
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
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {}
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "NONE",
  });
});

test("url.authorizer: none", async () => {
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      authorizer: "none"
    }
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "NONE",
  });
});

test("url.authorizer: iam", async () => {
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      authorizer: "iam"
    }
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    AuthType: "AWS_IAM",
  });
});

test("url.cors: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: { }
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
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: true,
    }
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
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: false,
    }
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: ABSENT,
  });
});

test("url.cors: props", async () => {
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: {
        allowMethods: ["GET"],
        allowOrigins: ["https://example.com"],
      }
    }
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
  const stack = new Stack(new App(), "stack");
  const fn = new Function(stack, "Function", {
    handler: "test/lambda.handler",
    url: {
      cors: {
        allowMethods: ["*"],
      }
    }
  });
  expect(fn.url).toBeDefined();
  hasResource(stack, "AWS::Lambda::Url", {
    Cors: {
      AllowMethods: ["*"],
    },
  });
});

test("layers: imported from another stack", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = new lambda.LayerVersion(stack1, "MyLayer", {
    code: lambda.Code.fromAsset("test")
  });
  new Function(stack1, "Function", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  new Function(stack2, "Function", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  expect(stack2.dependencies).toEqual([stack1]);

  countResources(stack1, "AWS::SSM::Parameter", 1);
  hasResource(stack1, "AWS::SSM::Parameter", {
    Value: { Ref: stringLike(/MyLayer.*/) }
  });
  countResources(stack1, "AWS::Lambda::LayerVersion", 1);
  hasResource(stack1, "AWS::Lambda::Function", {
    Layers: [{ Ref: stringLike(/MyLayer.*/) }]
  });

  countResources(stack2, "AWS::SSM::Parameter", 0);
  countResources(stack2, "AWS::Lambda::LayerVersion", 0);
  hasResource(stack2, "AWS::Lambda::Function", {
    Layers: [{ Ref: stringLike(/SsmParameterValue.*/) }]
  });
});

test("layers: imported from another stack multiple times", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = new lambda.LayerVersion(stack1, "MyLayer", {
    code: lambda.Code.fromAsset("test")
  });
  new Function(stack1, "Function", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  new Function(stack2, "FunctionA", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  new Function(stack2, "FunctionB", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  countResources(stack1, "AWS::SSM::Parameter", 1);
  countResources(stack1, "AWS::Lambda::LayerVersion", 1);
  hasResource(stack1, "AWS::Lambda::Function", {
    Layers: [{ Ref: stringLike(/MyLayer.*/) }]
  });

  countResources(stack2, "AWS::SSM::Parameter", 0);
  countResources(stack2, "AWS::Lambda::LayerVersion", 0);
  countResourcesLike(stack2, "AWS::Lambda::Function", 2, {
    Layers: [{ Ref: stringLike(/SsmParameterValue.*/) }]
  });
});

test("layers: imported from ARN", async () => {
  const app = new App();
  const stack1 = new Stack(app, "stack1");
  const stack2 = new Stack(app, "stack2");
  const layer = lambda.LayerVersion.fromLayerVersionArn(
    stack1,
    "MyLayer",
    "arn"
  );
  new Function(stack1, "Function", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  new Function(stack2, "Function", {
    handler: "test/lambda.handler",
    layers: [layer]
  });
  countResources(stack1, "AWS::SSM::Parameter", 0);
  countResources(stack1, "AWS::Lambda::LayerVersion", 0);
  hasResource(stack1, "AWS::Lambda::Function", {
    Layers: ["arn"]
  });

  countResources(stack2, "AWS::SSM::Parameter", 0);
  countResources(stack2, "AWS::Lambda::LayerVersion", 0);
  hasResource(stack2, "AWS::Lambda::Function", {
    Layers: ["arn"]
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
    debugIncreaseTimeout: true
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 900
  });
  hasResource(stack, "AWS::Lambda::EventInvokeConfig", {
    MaximumRetryAttempts: 0
  });
});

test("constructor: debugIncreaseTimeout false", async () => {
  const app = new App({
    synthCallback: () => {},
    debugEndpoint: "placeholder",
    debugBucketArn: "placeholder",
    debugBucketName: "placeholder",
    debugIncreaseTimeout: false
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 10
  });
  hasResource(stack, "AWS::Lambda::EventInvokeConfig", {
    MaximumRetryAttempts: 0
  });
});

/////////////////////////////
// Test Constructor for skipBuild
/////////////////////////////

test("constructor: skipBuild", async () => {
  const app = new App({
    skipBuild: true
  });
  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "placeholder",
    Code: {
      S3Bucket: ANY,
      S3Key: ANY
    }
  });
});

/////////////////////////////
// Test attachPermissions - generic
/////////////////////////////

test("attachPermissions: string: all", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions("*");
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "*", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: string: invalid", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  expect(() => {
    // @ts-ignore Allow type casting
    f.attachPermissions("abc" as Permissions);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermissions: array: empty", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: string", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions(["s3", "dynamodb:Get"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:Get", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst Api", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" }
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
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
                "arn:aws:execute-api:us-east-1:my-account:",
                { Ref: "ApiCD79AAA0" },
                "/*"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst ApiGatewayV1Api", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new ApiGatewayV1Api(stack, "Api", {
    routes: { "GET /": "test/lambda.handler" }
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
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
                "arn:aws:execute-api:us-east-1:my-account:",
                { Ref: "ApiCD79AAA0" },
                "/*"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst AppSyncApi", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new AppSyncApi(stack, "Api", {
    resolvers: { "Query notes": "test/lambda.handler" }
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([api]);
  hasResource(stack, "AWS::IAM::Policy", {
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
                "arn:aws:appsync:us-east-1:my-account:apis/",
                { "Fn::GetAtt": ["ApiCD79AAA0", "ApiId"] },
                "/*"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst WebSocketApi", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new WebSocketApi(stack, "Api", {
    routes: { $connect: "test/lambda.handler" }
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
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
                "arn:aws:execute-api:us-east-1:my-account:",
                { Ref: "ApiCD79AAA0" },
                "/*"
              ]
            ]
          }
        },
        {
          Action: "execute-api:ManageConnections",
          Effect: "Allow",
          Resource: {
            "Fn::Join": [
              "",
              [
                "arn:",
                { Ref: "AWS::Partition" },
                ":execute-api:us-east-1:my-account:",
                { Ref: "ApiCD79AAA0" },
                "/dev/POST/*"
              ]
            ]
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "functionA", {
    handler: "test/lambda.handler"
  });
  const f2 = new Function(stack, "functionB", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([f2]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "lambda:*",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["functionB93D70A66", "Arn"] }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst Bucket", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "bucket");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler"
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
                [{ "Fn::GetAtt": ["bucketBucketF19722A9", "Arn"] }, "/*"]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst EventBus", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "bus");
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([bus]);

  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "events:*",
          Effect: "Allow",
          Resource: { "Fn::GetAtt": ["busEventBus27CE599B", "Arn"] }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sst RDS", async () => {
  const stack = new Stack(new App(), "stack");
  const cluster = new RDS(stack, "cluster", {
    engine: "postgresql10.14",
    defaultDatabaseName: "acme"
  });
  const f = new Function(stack, "function", {
    handler: "test/lambda.handler"
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
                  Ref: "AWS::Partition"
                },
                ":rds:us-east-1:my-account:cluster:",
                {
                  Ref: "clusterCluster4486A143"
                }
              ]
            ]
          }
        },
        {
          Action: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret"
          ],
          Effect: "Allow",
          Resource: {
            Ref: "clusterClusterSecretAttachment92A36E7C"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sns topic", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([topic]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "sns:*",
          Effect: "Allow",
          Resource: { Ref: "TopicBFC7AF6E" }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: sns topic imported", async () => {
  const stack = new Stack(new App(), "stack");
  const topicArn = "arn:aws:sns:us-east-1:123:topic";
  const topic = sns.Topic.fromTopicArn(stack, "Topic", topicArn);
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([topic]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "sns:*",
          Effect: "Allow",
          Resource: topicArn
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: s3 bucket", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new s3.Bucket(stack, "Bucket");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
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
                [{ "Fn::GetAtt": ["Bucket83908E77", "Arn"] }, "/*"]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: s3 bucket imported", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
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
                    Ref: "AWS::Partition"
                  },
                  ":s3:::my-bucket"
                ]
              ]
            },
            {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":s3:::my-bucket/*"
                ]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: dynamodb table", async () => {
  const stack = new Stack(new App(), "stack");
  const table = new Table(stack, "Table", {
    fields: {
      id: "string"
    },
    primaryIndex: { partitionKey: "id" }
  });
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
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
                [{ "Fn::GetAtt": ["Table710B521B", "Arn"] }, "/*"]
              ]
            }
          ]
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: array: cfn construct not supported", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new apig.HttpApi(stack, "Api");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  expect(() => {
    f.attachPermissions([api]);
  }).toThrow(/The specified permissions are not supported/);
});

test("attachPermissions: array: cfn construct grant", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "Topic");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([[topic, "grantPublish"]]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        {
          Action: "sns:Publish",
          Effect: "Allow",
          Resource: { Ref: "TopicBFC7AF6E" }
        }
      ],
      Version: "2012-10-17"
    }
  });
});

test("attachPermissions: policy statement", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  f.attachPermissions([
    new iam.PolicyStatement({
      actions: ["s3:*"],
      resources: ["*"],
      effect: iam.Effect.ALLOW
    })
  ]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    }
  });
});

/////////////////////////////
// Test mergeProps
/////////////////////////////

test("mergeProps", async () => {
  const baseProps = {
    timeout: 5,
    srcPath: "path"
  };
  const props = {
    timeout: 10
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    timeout: 10,
    srcPath: "path"
  });
});

test("mergeProps-environment", async () => {
  const baseProps = {
    environment: {
      keyA: "valueA",
      keyB: "valueB"
    }
  };
  const props = {
    environment: {
      keyB: "valueB2",
      keyC: "valueC"
    }
  };
  const newProps = Function.mergeProps(baseProps, props);
  expect(newProps).toEqual({
    environment: {
      keyA: "valueA",
      keyB: "valueB2",
      keyC: "valueC"
    }
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

test("mergeProps-layers", async () => {
  const stack = new Stack(new App(), "stack");
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

test("mergeProps-bundle", async () => {
  // base props {}
  expect(Function.mergeProps({}, {})).toEqual({});

  expect(Function.mergeProps({}, { bundle: true })).toEqual({ bundle: true });

  expect(Function.mergeProps({}, { bundle: false })).toEqual({ bundle: false });

  expect(Function.mergeProps({}, { bundle: { nodeModules: [] } })).toEqual({
    bundle: { nodeModules: [] }
  });

  // base props { bundle: true }
  expect(Function.mergeProps({ bundle: true }, {})).toEqual({ bundle: true });

  expect(Function.mergeProps({ bundle: true }, { bundle: true })).toEqual({
    bundle: true
  });

  expect(Function.mergeProps({ bundle: true }, { bundle: false })).toEqual({
    bundle: false
  });

  expect(
    Function.mergeProps({ bundle: true }, { bundle: { nodeModules: [] } })
  ).toEqual({ bundle: { nodeModules: [] } });

  // base props { bundle: false }
  expect(Function.mergeProps({ bundle: false }, {})).toEqual({ bundle: false });

  expect(Function.mergeProps({ bundle: false }, { bundle: true })).toEqual({
    bundle: true
  });

  expect(Function.mergeProps({ bundle: false }, { bundle: false })).toEqual({
    bundle: false
  });

  expect(
    Function.mergeProps({ bundle: false }, { bundle: { nodeModules: [] } })
  ).toEqual({ bundle: { nodeModules: [] } });

  // base props { bundle: false }
  expect(Function.mergeProps({ bundle: { externalModules: [] } }, {})).toEqual({
    bundle: { externalModules: [] }
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
// Test normalizeSrcPath
/////////////////////////////

test("normalizeSrcPath", async () => {
  expect(Function.normalizeSrcPath(".")).toEqual(".");
  expect(Function.normalizeSrcPath("abc")).toEqual("abc");
  expect(Function.normalizeSrcPath("abc/")).toEqual("abc");
  expect(Function.normalizeSrcPath("/abc/xyz")).toEqual("/abc/xyz");
});

/////////////////////////////
// Test defaultFunctionProps
/////////////////////////////

test("Stack.defaultFunctionProps()", async () => {
  const app = new App();

  const stack = new Stack(app, "stack");
  stack.setDefaultFunctionProps({
    timeout: 15
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" }
  });
});

test("Stack.defaultFunctionProps(): after Function resource", async () => {
  const app = new App();
  const stack = new Stack(app, "Stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  expect(() => {
    stack.setDefaultFunctionProps({
      timeout: 10
    });
  }).toThrowError();
});

test("Stack.defaultFunctionProps(): after non-Function resource", async () => {
  const app = new App();
  const stack = new Stack(app, "Stack");
  new Bucket(stack, "Bucket");
  stack.setDefaultFunctionProps({
    timeout: 15
  });
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Timeout: 15
  });
});

test("Stack.defaultFunctionProps(): env", async () => {
  const app = new App();

  const stack = new Stack(app, "stack");
  stack.addDefaultFunctionEnv({ keyA: "valueA" });
  stack.addDefaultFunctionEnv({ keyB: "valueB" });
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("Stack.defaultFunctionProps(): permissions", async () => {
  const app = new App();

  const stack = new Stack(app, "stack");
  stack.addDefaultFunctionPermissions(["s3"]);
  stack.addDefaultFunctionPermissions(["dynamodb"]);
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:*", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    }
  });
});

test("App.defaultFunctionProps()", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" }
  });
});

test("App.defaultFunctionProps(): calledTwice", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 256,
    environment: { keyA: "valueA" }
  });
  app.setDefaultFunctionProps({
    timeout: 10,
    environment: { keyB: "valueB" }
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10,
    MemorySize: 256,
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    },
    TracingConfig: { Mode: "Active" }
  });
});

test("App.defaultFunctionProps(): after Stack with Function resource", async () => {
  const app = new App();
  const stack = new Stack(app, "Stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  expect(() => {
    app.setDefaultFunctionProps({
      timeout: 10
    });
  }).toThrowError();
});

test("App.defaultFunctionProps(): after Stack without Function resource", async () => {
  const app = new App();
  new Stack(app, "Stack");
  expect(() => {
    app.setDefaultFunctionProps({
      timeout: 10
    });
  }).not.toThrowError();
});

test("App.defaultFunctionProps(): env", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    environment: { keyA: "valueA" }
  });
  app.addDefaultFunctionEnv({ keyB: "valueB" });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("App.defaultFunctionProps(): permissions", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    permissions: ["s3"]
  });
  app.addDefaultFunctionPermissions(["dynamodb"]);

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
        { Action: "dynamodb:*", Effect: "Allow", Resource: "*" }
      ],
      Version: "2012-10-17"
    }
  });
});

test("App.defaultFunctionProps(): callback", async () => {
  const app = new App();
  app.setDefaultFunctionProps(() => ({
    timeout: 15
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 15,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" }
  });
});

test("App.defaultFunctionProps(): callback-calledTwice", async () => {
  const app = new App();
  app.setDefaultFunctionProps(() => ({
    timeout: 15,
    memorySize: 256,
    environment: { keyA: "valueA" }
  }));
  app.setDefaultFunctionProps(() => ({
    timeout: 10,
    environment: { keyB: "valueB" }
  }));

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10,
    MemorySize: 256,
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    },
    TracingConfig: { Mode: "Active" }
  });
});

test("App.defaultFunctionProps(): override", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    environment: { keyA: "valueA" }
  });

  const stack = new Stack(app, "stack");
  new Function(stack, "Function", {
    handler: "test/lambda.handler",
    timeout: 10,
    environment: { keyB: "valueB" }
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10,
    MemorySize: 1024,
    TracingConfig: { Mode: "Active" },
    Environment: {
      Variables: {
        keyA: "valueA",
        keyB: "valueB",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

/////////////////////////////
// Test fromDefinition
/////////////////////////////

test("fromDefinition-string", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10
  });
});

test("fromDefinition-string-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler");
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 15,
    MemorySize: 2048
  });
});

test("fromDefinition-string-inherit", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 20
  });
});

test("fromDefinition-string-inherit-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 2048
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(stack, "Function", "test/lambda.handler", {
    timeout: 20
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 20,
    MemorySize: 2048
  });
});

test("fromDefinition-props", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(stack, "Function", {
    handler: "test/lambda.handler"
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler"
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
      environment: { KEY_A: "a" }
    },
    {
      runtime: "nodejs10.x",
      memorySize: 512,
      environment: { KEY_B: "b" }
    }
  );
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Runtime: "nodejs10.x",
    MemorySize: 2048,
    Environment: {
      Variables: {
        KEY_A: "a",
        KEY_B: "b",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("fromDefinition-props-inherit-with-app-defaultFunctionProps", async () => {
  const app = new App();
  app.setDefaultFunctionProps({
    timeout: 15,
    memorySize: 1024,
    environment: { KEY_A: "a" }
  });

  const stack = new Stack(app, "stack");
  Function.fromDefinition(
    stack,
    "Function",
    {
      handler: "test/lambda.handler",
      memorySize: 2048,
      environment: { KEY_B: "b" }
    },
    {
      runtime: "nodejs10.x",
      memorySize: 512,
      environment: { KEY_C: "c" }
    }
  );
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Runtime: "nodejs10.x",
    Timeout: 15,
    MemorySize: 2048,
    Environment: {
      Variables: {
        KEY_A: "a",
        KEY_B: "b",
        KEY_C: "c",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"
      }
    }
  });
});

test("fromDefinition-sstFunction", async () => {
  const stack = new Stack(new App(), "stack");
  Function.fromDefinition(
    stack,
    "Function",
    new Function(stack, "Function", {
      handler: "test/lambda.handler",
      timeout: 20
    })
  );
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 20
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
        timeout: 20
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
        handler: "test/lambda.handler",
        code: lambda.Code.fromAsset("test")
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
