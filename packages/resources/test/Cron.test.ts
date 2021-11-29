import {
  expect as expectCdk,
  countResources,
  haveResource,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import { App, Stack, Cron, CronProps, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("constructor: eventsRule", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      ScheduleExpression: "rate(1 minute)",
    })
  );
});

test("constructor: eventsRule schedule redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cron(stack, "Cron", {
      schedule: "rate(1 minute)",
      job: "test/lambda.handler",
      eventsRule: {
        schedule: events.Schedule.expression("rate(1 minute)"),
      },
    });
  }).toThrow(/Do not configure the "eventsRule.schedule"./);
});

test("schedule-string", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      ScheduleExpression: "rate(1 minute)",
    })
  );
});

test("schedule-rate", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: cdk.Duration.days(1),
    job: "test/lambda.handler",
  });
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      ScheduleExpression: "rate(1 day)",
    })
  );
});

test("schedule-cron", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: { minute: "0", hour: "4" },
    job: "test/lambda.handler",
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      ScheduleExpression: "cron(0 4 * * ? *)",
    })
  );
});

test("schedule-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cron(stack, "Cron", {
      job: "test/lambda.handler",
    });
  }).toThrow(/No schedule defined/);
});

test("job is string", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("job is Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: f,
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("job is FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: { handler: "test/lambda.handler" },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
});

test("job is CronJobProps", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: {
      function: "test/lambda.handler",
      jobProps: {
        event: events.RuleTargetInput.fromText("abc"),
      },
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "test/lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::Events::Rule", 1));
  expectCdk(stack).to(
    haveResource("AWS::Events::Rule", {
      ScheduleExpression: "rate(1 minute)",
      Targets: [
        {
          Arn: {
            "Fn::GetAtt": ["CronJob6D181881", "Arn"],
          },
          Id: "Target0",
          Input: '"abc"',
        },
      ],
    })
  );
});

test("job is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cron(stack, "Cron", {
      schedule: "rate(1 minute)",
    } as CronProps);
  }).toThrow(/No job defined/);
});

///////////////////
// Test Methods
///////////////////

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  cron.attachPermissions(["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "CronJobServiceRoleDefaultPolicy283E5BD2",
    })
  );
});

test("getConstructInfo: triggers in same stack", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });

  expect(cron.getConstructInfo()).toStrictEqual([
    {
      type: "Cron",
      name: "Cron",
      stack: "dev-my-app-stack",
      addr: expect.anything(),
      ruleName: expect.anything(),
      schedule: "rate(1 minute)",
    },
    {
      type: "CronJob",
      stack: "dev-my-app-stack",
      parentAddr: expect.anything(),
      functionArn: expect.anything(),
    },
  ]);
});

test("getConstructInfo: triggers in diff stack", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const fn = new Function(stackB, "Fn", {
    handler: "test/lambda.handler",
  });
  const cron = new Cron(stackA, "Cron", {
    schedule: "rate(1 minute)",
    job: fn,
  });

  expect(cron.getConstructInfo()).toStrictEqual([
    {
      type: "Cron",
      name: "Cron",
      stack: "dev-my-app-stackA",
      addr: expect.anything(),
      ruleName: expect.anything(),
      schedule: "rate(1 minute)",
    },
    {
      type: "CronJob",
      stack: "dev-my-app-stackB",
      parentAddr: expect.anything(),
      functionArn: expect.anything(),
    },
  ]);
});
