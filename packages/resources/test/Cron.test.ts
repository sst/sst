import { test, expect } from "vitest";
import { countResources, hasResource } from "./helper";
import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
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
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    State: "ENABLED",
    ScheduleExpression: "rate(1 minute)",
  });
});

test("schedule is rate", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "rate(1 minute)",
  });
});

test("schedule is cron", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "cron(15 10 * * ? *)",
    job: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "cron(15 10 * * ? *)",
  });
});

test("schedule is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cron(stack, "Cron", {
      job: "test/lambda.handler",
    });
  }).toThrow(/No schedule defined/);
});

test("enabled is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Events::Rule", {
    State: "ENABLED",
  });
});

test("enabled is true", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
    enabled: true,
  });
  hasResource(stack, "AWS::Events::Rule", {
    State: "ENABLED",
  });
});

test("enabled is false", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
    enabled: false,
  });
  hasResource(stack, "AWS::Events::Rule", {
    State: "DISABLED",
  });
});

test("cdk.rule.schedule-rate", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    job: "test/lambda.handler",
    cdk: {
      rule: {
        schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      },
    },
  });
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "rate(1 minute)",
  });
});

test("cdk.rule.schedule-cron", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    job: "test/lambda.handler",
    cdk: {
      rule: {
        schedule: events.Schedule.cron({ minute: "0", hour: "4" }),
      },
    },
  });
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "cron(0 4 * * ? *)",
  });
});

test("job is string", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("job is Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: f,
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("job is CronJobProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: {
      function: "test/lambda.handler",
      cdk: {
        target: {
          event: events.RuleTargetInput.fromText("abc"),
        },
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
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
  });
});

test("job is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    // @ts-ignore Allow undefined "job"
    new Cron(stack, "Cron", {
      schedule: "rate(1 minute)",
    } as CronProps);
  }).toThrow(/job/);
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
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "CronJobServiceRoleDefaultPolicy283E5BD2",
  });
});
