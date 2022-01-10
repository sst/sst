import {
  expect as expectCdk,
  countResources,
  haveResource,
  objectLike,
  stringLike,
  ABSENT,
} from "aws-cdk-lib/assert";
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

test("eventBridgeEventBus: is events.EventBus construct", async () => {
  const stack = new Stack(new App(), "stack");
  const iBus = new events.EventBus(stack, "T", {
    eventBusName: "my-bus",
  });
  const bus = new EventBus(stack, "EventBus", {
    eventBridgeEventBus: iBus,
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::EventBus", {
      Name: "my-bus",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Name: "dev-my-app-rule1",
      EventBusName: { Ref: "TD925BC7E" },
      EventPattern: { source: ["aws.codebuild"] },
      State: "ENABLED",
      Targets: [
        objectLike({
          Id: "Target0",
        }),
      ],
    })
  );
});

test("eventBridgeEventBus: is imported by eventBusArn", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    eventBridgeEventBus: events.EventBus.fromEventBusArn(
      stack,
      "B",
      "arn:aws:events:us-east-1:123456789:event-bus/default"
    ),
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 0));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Name: "dev-my-app-rule1",
      EventBusName: "default",
      EventPattern: { source: ["aws.codebuild"] },
      State: "ENABLED",
      Targets: [
        objectLike({
          Id: "Target0",
        }),
      ],
    })
  );
});

test("eventBridgeEventBus: is imported by eventBusName", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    eventBridgeEventBus: events.EventBus.fromEventBusName(
      stack,
      "B",
      "default"
    ),
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
});

test("eventBridgeEventBus: is props with eventBusName", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    eventBridgeEventBus: {
      eventBusName: "my-bus",
    },
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Name: "dev-my-app-rule1",
      EventBusName: { Ref: "EventBusE9ABF535" },
      EventPattern: { source: ["aws.codebuild"] },
      State: "ENABLED",
      Targets: [
        objectLike({
          Id: "Target0",
        }),
      ],
    })
  );
});

test("eventBridgeEventBus: is props with eventSourceName", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    eventBridgeEventBus: {
      eventSourceName: "aws.partner/auth0.com/source",
    },
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::EventBus", {
      Name: "aws.partner/auth0.com/source",
      EventSourceName: "aws.partner/auth0.com/source",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
});

test("eventBridgeEventBus: is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(bus.eventBusArn).toBeDefined();
  expect(bus.eventBusName).toBeDefined();
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::EventBus", {
      Name: "dev-my-app-EventBus",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Name: "dev-my-app-rule1",
      EventBusName: { Ref: "EventBusE9ABF535" },
      EventPattern: { source: ["aws.codebuild"] },
      State: "ENABLED",
      Targets: [
        objectLike({
          Id: "Target0",
        }),
      ],
    })
  );
});

test("rules: props", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        ruleName: "my-rule",
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Name: "my-rule",
      EventBusName: { Ref: "EventBusE9ABF535" },
      EventPattern: { source: ["aws.codebuild"] },
      State: "ENABLED",
      Targets: [
        objectLike({
          Id: "Target0",
        }),
      ],
    })
  );
});

test("rules: eventBus defined error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new EventBus(stack, "EventBus", {
      rules: {
        rule1: {
          // @ts-expect-error "eventBus" is not a prop
          eventBus: new events.EventBus(stack, "T", {
            eventBusName: "my-bus",
          }),
          eventPattern: { source: ["aws.codebuild"] },
          targets: ["test/lambda.handler"],
        },
      },
    });
  }).toThrow(/Cannot configure the "rule.eventBus" in the "EventBus" EventBus/);
});

test("targets: Function string single", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [objectLike({ Id: "Target0" })],
    })
  );
});

test("targets: Function strings multi", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler", "test/lambda.handler"],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [objectLike({ Id: "Target0" }), objectLike({ Id: "Target1" })],
    })
  );
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
        eventPattern: { source: ["aws.codebuild"] },
        targets: [f],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [objectLike({ Id: "Target0" })],
    })
  );
});

test("targets: Function props", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: [{ handler: "test/lambda.handler" }],
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [objectLike({ Id: "Target0" })],
    })
  );
});

test("targets: Function with defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    defaultFunctionProps: {
      timeout: 3,
      environment: {
        keyA: "valueA",
      },
    },
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: [{ handler: "test/lambda.handler" }],
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",

      Timeout: 3,
      Environment: {
        Variables: {
          keyA: "valueA",
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        },
      },
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
});

test("targets: EventBusFunctionTargetProps", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: [
          {
            function: "test/lambda.handler",
            targetProps: {
              retryAttempts: 20,
            },
          },
        ],
      },
    },
  });
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [
        objectLike({
          Id: "Target0",
          RetryPolicy: {
            MaximumRetryAttempts: 20,
          },
        }),
      ],
    })
  );
});

test("targets: Queue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: [queue],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::SQS::Queue", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [
        {
          Id: "Target0",
          Arn: {
            "Fn::GetAtt": ["Queue381943A6", "Arn"],
          },
        },
      ],
    })
  );
});

test("targets: EventBusQueueTargetProps", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue", {
    sqsQueue: {
      queueName: "queue.fifo",
      fifo: true,
    },
  });
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: [
          {
            queue,
            targetProps: {
              messageGroupId: "group-id",
            },
          },
        ],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::SQS::Queue", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
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
    })
  );
});

test("targets: empty", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: [],
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: ABSENT,
    })
  );
});

test("targets: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: ABSENT,
    })
  );
});

///////////////////
// Test Methods
///////////////////

test("addRules: add Function targets", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  bus.addRules(stack, {
    rule2: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["test/lambda.handler"],
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 2));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [
        {
          Id: "Target0",
          Arn: {
            "Fn::GetAtt": [stringLike("EventBusrule1target0*"), "Arn"],
          },
        },
      ],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [
        {
          Id: "Target0",
          Arn: {
            "Fn::GetAtt": [stringLike("rule2target0468369E9*"), "Arn"],
          },
        },
      ],
    })
  );
});

test("addRules: add Queue targets", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  bus.addRules(stack, {
    rule2: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: [queue],
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::Events::EventBus", 1));
  expectCdk(stack).to(countResources("AWS::Events::Rule", 2));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [
        {
          Id: "Target0",
          Arn: {
            "Fn::GetAtt": [stringLike("EventBusrule1target0*"), "Arn"],
          },
        },
      ],
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      Targets: [
        {
          Id: "Target0",
          Arn: {
            "Fn::GetAtt": [stringLike("Queue*"), "Arn"],
          },
        },
      ],
    })
  );
});

test("addRules: thrashing rule name error", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });

  expect(() => {
    bus.addRules(stack, {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    });
  }).toThrow(/A rule already exists for "rule1"/);
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler", "test/lambda.handler"],
      },
    },
  });
  bus.attachPermissions(["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "EventBusrule1target0ServiceRoleDefaultPolicy28662B2E",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "EventBusrule1target1ServiceRoleDefaultPolicy99BF5409",
    })
  );
});

test("attachPermissionsToTarget", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler", "test/lambda.handler"],
      },
    },
  });
  bus.attachPermissionsToTarget("rule1", 0, ["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "EventBusrule1target0ServiceRoleDefaultPolicy28662B2E",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy],
        Version: "2012-10-17",
      },
      PolicyName: "EventBusrule1target1ServiceRoleDefaultPolicy99BF5409",
    })
  );
});

test("attachPermissionsToTarget: rule not exist", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(() => {
    bus.attachPermissionsToTarget("unknown-rule", 0, ["s3"]);
  }).toThrow(/Cannot find the rule "unknown-rule" in the "EventBus" EventBus./);
});

test("attachPermissionsToTarget: target not exist", async () => {
  const stack = new Stack(new App(), "stack");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  expect(() => {
    bus.attachPermissionsToTarget("rule1", 100, ["s3"]);
  }).toThrow(/Cannot attach permissions/);
});

test("attachPermissionsToTarget: target is Queue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const bus = new EventBus(stack, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler", queue],
      },
    },
  });
  expect(() => {
    bus.attachPermissionsToTarget("rule1", 1, ["s3"]);
  }).toThrow(/Cannot attach permissions/);
});

test("attachPermissions-after-addRules", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const bus = new EventBus(stackA, "EventBus", {
    rules: {
      rule1: {
        eventPattern: { source: ["aws.codebuild"] },
        targets: ["test/lambda.handler"],
      },
    },
  });
  bus.attachPermissions(["s3"]);
  bus.addRules(stackB, {
    rule2: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["test/lambda.handler"],
    },
  });
  expectCdk(stackA).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "EventBusrule1target0ServiceRoleDefaultPolicy28662B2E",
    })
  );
  expectCdk(stackB).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stackB).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "rule2target0ServiceRoleDefaultPolicy1AE526DF",
    })
  );
});
