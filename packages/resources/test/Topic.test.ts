import "@aws-cdk/assert/jest";
import * as sns from "@aws-cdk/aws-sns";
import { App, Stack, Topic, TopicProps, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

test("subscribers-string", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers-string-multiple", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 2);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers-Function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Topic(stack, "Topic", {
    subscribers: [f],
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers-FunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [{ handler: "test/lambda.handler" }],
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Topic(stack, "Topic", {} as TopicProps);
  }).toThrow(/No subscribers defined/);
});

test("subscribers-empty", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Topic(stack, "Topic", {
      subscribers: [],
    });
  }).toThrow(/No subscribers defined/);
});

test("snsTopic", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "T", {
    topicName: "my-topic",
  });
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
    snsTopic: topic,
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "my-topic",
  });
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  topic.attachPermissions(["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber0ServiceRoleDefaultPolicyB81AA9BE",
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber1ServiceRoleDefaultPolicyA0E825CD",
  });
});

test("attachPermissionsToSubscriber", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  topic.attachPermissionsToSubscriber(0, ["s3"]);
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber0ServiceRoleDefaultPolicyB81AA9BE",
  });
  expect(stack).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber1ServiceRoleDefaultPolicyA0E825CD",
  });
});
