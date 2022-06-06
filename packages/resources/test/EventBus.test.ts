import { test, expect } from "vitest";
import {
  countResources,
  hasResource,
  objectLike,
  stringLike,
  ABSENT,
} from "./helper";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import { App, Stack, EventBus, Queue, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("cdk.eventBus: is created construct", async () => {
  const stack = new Stack(new App(), "stack");
  const iBus = new events.EventBus(stack, "T", {
    eventBusName: "my-bus",
  });
  const bus = new EventBus(stack, "EventBus", {
    cdk: {
      eventBus: iBus,
    },
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::EventBus", 1);
  hasResource(stack, "AWS::Events::EventBus", {
    Name: "my-bus",
  });
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Name: "dev-my-app-rule1",
    EventBusName: { Ref: "TD925BC7E" },
    EventPattern: { source: ["aws.codebuild"] },
    State: "ENABLED",
    Targets: [
      objectLike({
        Id: "Target0",
      }),
    ],
  });
});

test("cdk.eventBus: is imported by eventBusArn", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    cdk: {
      eventBus: events.EventBus.fromEventBusArn(
        stack,
        "B",
        "arn:aws:events:us-east-1:123456789:event-bus/default"
      ),
    },
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 0);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Name: "dev-my-app-rule1",
    EventBusName: "default",
    EventPattern: { source: ["aws.codebuild"] },
    State: "ENABLED",
    Targets: [
      objectLike({
        Id: "Target0",
      }),
    ],
  });
});

test("cdk.eventBus: is imported by eventBusName", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    cdk: {
      eventBus: events.EventBus.fromEventBusName(stack, "B", "default"),
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
});

test("cdk.eventBus: is props with eventBusName", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    cdk: {
      eventBus: {
        eventBusName: "my-bus",
      },
    },
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Name: "dev-my-app-rule1",
    EventBusName: { Ref: "EventBusE9ABF535" },
    EventPattern: { source: ["aws.codebuild"] },
    State: "ENABLED",
    Targets: [
      objectLike({
        Id: "Target0",
      }),
    ],
  });
});

test("cdk.eventBus: is props with eventSourceName", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    cdk: {
      eventBus: {
        eventSourceName: "aws.partner/auth0.com/source",
      },
    },
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  hasResource(stack, "AWS::Events::EventBus", {
    Name: "aws.partner/auth0.com/source",
    EventSourceName: "aws.partner/auth0.com/source",
  });
  countResources(stack, "AWS::Events::Rule", 1);
});

test("cdk.eventBus: is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  hasResource(stack, "AWS::Events::EventBus", {
    Name: "dev-my-app-EventBus",
  });
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Name: "dev-my-app-rule1",
    EventBusName: { Ref: "EventBusE9ABF535" },
    EventPattern: { source: ["aws.codebuild"] },
    State: "ENABLED",
    Targets: [
      objectLike({
        Id: "Target0",
      }),
    ],
  });
});

test("rules: props", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        cdk: {
          rule: {
            ruleName: "my-rule",
            eventPattern: { source: ["aws.ec2"] },
          },
        },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Name: "my-rule",
    EventBusName: { Ref: "EventBusE9ABF535" },
    EventPattern: { source: ["aws.ec2"] },
    State: "ENABLED",
    Targets: [
      objectLike({
        Id: "Target0",
      }),
    ],
  });
});

test("rules: props pattern override cdk.rule.eventPattern", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        cdk: {
          rule: {
            ruleName: "my-rule",
            eventPattern: { source: ["aws.ec2"] },
          },
        },
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Name: "my-rule",
    EventBusName: { Ref: "EventBusE9ABF535" },
    EventPattern: { source: ["aws.codebuild"] },
    State: "ENABLED",
    Targets: [
      objectLike({
        Id: "Target0",
      }),
    ],
  });
});

test("rules: eventBus defined error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new EventBus(stack, "EventBus", {
      rules: {
        rule1: {
          cdk: {
            rule: {
              // @ts-expect-error "eventBus" is not a prop
              eventBus: new events.EventBus(stack, "T", {
                eventBusName: "my-bus",
              }),
            },
          },
          pattern: { source: ["aws.codebuild"] },
          targets: { "0": "test/lambda.handler" },
        },
      },
    });
  }).toThrow(
    /Cannot configure the "rule.cdk.rule.eventBus" in the "EventBus" EventBus/
  );
});

test("targets: Function string single", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [objectLike({ Id: "Target0" })],
  });
});

test("targets: Function strings multi", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": "test/lambda.handler",
          "1": "test/lambda.handler",
        },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [objectLike({ Id: "Target0" }), objectLike({ Id: "Target1" })],
  });
});

test("targets: Function construct", async () => {
  const app = new App();
  const stackFn = new Stack(app, "stackFn");
  const stack = new Stack(app, "stack");
  const f = new Function(stackFn, "Function", {
    handler: "test/lambda.handler",
  });
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": f },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [objectLike({ Id: "Target0" })],
  });
});

test("targets: Function with target props", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": {
            function: "test/lambda.handler",
            cdk: {
              target: {
                retryAttempts: 20,
              },
            },
          },
        },
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      objectLike({
        Id: "Target0",
        RetryPolicy: {
          MaximumRetryAttempts: 20,
        },
      }),
    ],
  });
});

test("targets: cdk.Function with target props", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": {
            function: "test/lambda.handler",
            cdk: {
              function: lambda.Function.fromFunctionName(stack, "IFunction", "arn:aws:lambda:us-east-1:123456789:function/test"),
              target: {
                retryAttempts: 20,
              },
            },
          },
        },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      objectLike({
        Id: "Target0",
        Arn: {
          "Fn::Join": [
            "",
            [
              "arn:",
              { Ref: "AWS::Partition" },
              ":lambda:us-east-1:my-account:function:arn:aws:lambda:us-east-1:123456789:function/test",
            ]
          ]
        },
        RetryPolicy: {
          MaximumRetryAttempts: 20,
        },
      }),
    ],
  });
});

test("targets: Queue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": queue },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      {
        Id: "Target0",
        Arn: {
          "Fn::GetAtt": ["Queue381943A6", "Arn"],
        },
      },
    ],
  });
});

test("targets: Queue with target props", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue", {
    cdk: {
      queue: {
        queueName: "queue.fifo",
        fifo: true,
      },
    },
  });
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": {
            type: "queue",
            queue,
            cdk: {
              target: {
                messageGroupId: "group-id",
              },
            },
          },
        },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      {
        Id: "Target0",
        Arn: {
          "Fn::GetAtt": ["Queue381943A6", "Arn"],
        },
        SqsParameters: {
          MessageGroupId: "group-id",
        },
      },
    ],
  });
});

test("targets: empty", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {},
      },
    },
  });
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: ABSENT,
  });
});

test("targets: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
      },
    },
  });
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: ABSENT,
  });
});

///////////////////
// Test Methods
///////////////////

test("addRules: add Function targets", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  bus.addRules(stack, {
    rule2: {
      pattern: { source: ["aws.codebuild"] },
      targets: { "0": "test/lambda.handler" },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 2);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      {
        Id: "Target0",
        Arn: {
          "Fn::GetAtt": [stringLike(/EventBusTarget.*/), "Arn"],
        },
      },
    ],
  });
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      {
        Id: "Target0",
        Arn: {
          "Fn::GetAtt": [stringLike(/Target.*/), "Arn"],
        },
      },
    ],
  });
});

test("addRules: add Queue targets", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  bus.addRules(stack, {
    rule2: {
      pattern: { source: ["aws.codebuild"] },
      targets: { "0": queue },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::Events::EventBus", 1);
  countResources(stack, "AWS::Events::Rule", 2);
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      {
        Id: "Target0",
        Arn: {
          "Fn::GetAtt": [stringLike(/EventBusTarget.*/), "Arn"],
        },
      },
    ],
  });
  hasResource(stack, "AWS::Events::Rule", {
    Targets: [
      {
        Id: "Target0",
        Arn: {
          "Fn::GetAtt": [stringLike(/Queue.*/), "Arn"],
        },
      },
    ],
  });
});

test("addRules: thrashing rule name error", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });

  expect(() => {
    bus.addRules(stack, {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    });
  }).toThrow(/A rule already exists for "rule1"/);
});

test("getRule", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(api.getRule("rule1")).toBeDefined();
  expect(api.getRule("rule2")).toBeUndefined();
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": "test/lambda.handler",
          "1": "test/lambda.handler",
        },
      },
    },
  });
  bus.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "EventBusTargetEventBusrule10ServiceRoleDefaultPolicy43D252A7",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "EventBusTargetEventBusrule11ServiceRoleDefaultPolicy5C865C6D",
  });
});

test("attachPermissionsToTarget", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": "test/lambda.handler",
          "1": "test/lambda.handler",
        },
      },
    },
  });
  bus.attachPermissionsToTarget("rule1", "0", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "EventBusTargetEventBusrule10ServiceRoleDefaultPolicy43D252A7",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "EventBusTargetEventBusrule11ServiceRoleDefaultPolicy5C865C6D",
  });
});

test("attachPermissionsToTarget: rule not exist", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(() => {
    bus.attachPermissionsToTarget("unknown-rule", "0", ["s3"]);
  }).toThrow(/Cannot find the rule "unknown-rule" in the "EventBus" EventBus./);
});

test("attachPermissionsToTarget: target not exist", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  expect(() => {
    bus.attachPermissionsToTarget("rule1", "100", ["s3"]);
  }).toThrow(/Cannot attach permissions/);
});

test("attachPermissionsToTarget: target is Queue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: {
          "0": "test/lambda.handler",
          "1": queue,
        },
      },
    },
  });
  expect(() => {
    bus.attachPermissionsToTarget("rule1", "1", ["s3"]);
  }).toThrow(/Cannot attach permissions/);
});

test("attachPermissions-after-addRules", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const bus = new EventBus(stackA, "EventBus", {
    rules: {
      rule1: {
        pattern: { source: ["aws.codebuild"] },
        targets: { "0": "test/lambda.handler" },
      },
    },
  });
  bus.attachPermissions(["s3"]);
  bus.addRules(stackB, {
    rule2: {
      pattern: { source: ["aws.codebuild"] },
      targets: { "0": "test/lambda.handler" },
    },
  });
  countResources(stackA, "AWS::Events::Rule", 1);
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "EventBusTargetEventBusrule10ServiceRoleDefaultPolicy43D252A7",
  });
  countResources(stackB, "AWS::Events::Rule", 1);
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TargetEventBusrule20ServiceRoleDefaultPolicy451500AE",
  });
});
