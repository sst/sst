import "@aws-cdk/assert/jest";
import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import { App, Stack, Cron, CronProps, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

test("schedule-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Events::Rule", {
    ScheduleExpression: "rate(1 minute)",
  });
});

test("schedule-rate", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: cdk.Duration.days(1),
    job: "test/lambda.handler",
  });
  expect(stack).toHaveResource("AWS::Events::Rule", {
    ScheduleExpression: "rate(1 day)",
  });
});

test("schedule-cron", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: { minute: "0", hour: "4" },
    job: "test/lambda.handler",
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  expect(stack).toCountResources("AWS::Events::Rule", 1);
  expect(stack).toHaveResource("AWS::Events::Rule", {
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

test("job-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("job-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: f,
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("job-FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: { handler: "test/lambda.handler" },
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
});

test("job-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Cron(stack, "Cron", {
      schedule: "rate(1 minute)",
    } as CronProps);
  }).toThrow(/No job defined/);
});

test("eventsRule", async () => {
  const stack = new Stack(new App(), "stack");
  const rule = new events.Rule(stack, "Rule", {
    schedule: events.Schedule.expression("rate(1 minute)"),
  });
  new Cron(stack, "Cron", {
    job: "test/lambda.handler",
    eventsRule: rule,
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  expect(stack).toCountResources("AWS::Events::Rule", 1);
  expect(stack).toHaveResource("AWS::Events::Rule", {
    ScheduleExpression: "rate(1 minute)",
  });
});

test("eventsRule-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  const rule = new events.Rule(stack, "Rule", {
    schedule: events.Schedule.expression("rate(1 minute)"),
  });
  expect(() => {
    new Cron(stack, "Cron", {
      schedule: "rate(1 minute)",
      job: "test/lambda.handler",
      eventsRule: rule,
    });
  }).toThrow(/Cannot define both schedule and eventsRule/);
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const cron = new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "test/lambda.handler",
  });
  cron.attachPermissions(["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
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
