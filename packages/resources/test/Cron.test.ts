import {
  countResources,
  hasResource,
} from "./helper";
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
    ScheduleExpression: "rate(1 minute)",
  });
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
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "rate(1 minute)",
  });
});

test("schedule-rate", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: cdk.Duration.days(1),
    job: "test/lambda.handler",
  });
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "rate(1 day)",
  });
});

test("schedule-cron", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: { minute: "0", hour: "4" },
    job: "test/lambda.handler",
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::Events::Rule", 1);
  hasResource(stack, "AWS::Events::Rule", {
    ScheduleExpression: "cron(0 4 * * ? *)",
  });
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

test("job is FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: { handler: "test/lambda.handler" },
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
      jobProps: {
        event: events.RuleTargetInput.fromText("abc"),
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
