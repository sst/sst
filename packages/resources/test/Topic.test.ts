import "@aws-cdk/assert/jest";
import * as sns from "@aws-cdk/aws-sns";
import { App, Stack, Topic, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

test("snsTopic-is-snsTopicConstruct", async () => {
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

test("snsTopic-is-snsTopicProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    snsTopic: {
      topicName: "my-topic",
    },
    subscribers: ["test/lambda.handler"],
  });
  expect(stack).toCountResources("AWS::Lambda::Function", 1);
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
});

test("subscribers-function-string-single", async () => {
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

test("subscribers-function-string-multi", async () => {
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

test("subscribers-function-construct", async () => {
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

test("subscribers-function-props", async () => {
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

test("subscribers-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [
      {
        function: "test/lambda.handler",
        subscriberProps: {
          filterPolicy: {
            color: sns.SubscriptionFilter.stringFilter({
              whitelist: ["red", "orange"],
            }),
          },
        },
      },
    ],
  });
  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  });
  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
  expect(stack).toCountResources("AWS::SNS::Subscription", 1);
  expect(stack).toHaveResource("AWS::SNS::Subscription", {
    FilterPolicy: { color: ["red", "orange"] },
  });
});

test("subscribers-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [],
  });
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
  expect(stack).toCountResources("AWS::SNS::Subscription", 0);
});

test("subscribers-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic");
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
  expect(stack).toCountResources("AWS::SNS::Subscription", 0);
});

test("addSubscribers", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  topic.addSubscribers(stack, ["test/lambda.handler"]);
  expect(stack).toCountResources("AWS::Lambda::Function", 2);
  expect(stack).toCountResources("AWS::SNS::Topic", 1);
  expect(stack).toCountResources("AWS::SNS::Subscription", 2);
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

test("attachPermissions-after-addSubscribers", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const topic = new Topic(stackA, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  topic.attachPermissions(["s3"]);
  topic.addSubscribers(stackB, ["test/lambda.handler"]);
  expect(stackA).toCountResources("AWS::SNS::Subscription", 1);
  expect(stackA).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber0ServiceRoleDefaultPolicyB81AA9BE",
  });
  expect(stackB).toCountResources("AWS::SNS::Subscription", 1);
  expect(stackB).toHaveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "Subscriber1ServiceRoleDefaultPolicy1E5C9A05",
  });
});
