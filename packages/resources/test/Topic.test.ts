import {
  countResources,
  hasResource,
} from "./helper";
import * as sns from "aws-cdk-lib/aws-sns";
import { App, Stack, Topic, Queue, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("constructor: snsTopic is imported", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
    snsTopic: sns.Topic.fromTopicArn(
      stack,
      "T",
      "arn:aws:sns:us-east-1:123:topic"
    ),
  });
  expect(topic.topicArn).toBeDefined();
  expect(topic.topicName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::SNS::Topic", 0);
});

test("constructor: snsTopic is props", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    snsTopic: {
      topicName: "my-topic",
    },
    subscribers: ["test/lambda.handler"],
  });
  expect(topic.topicArn).toBeDefined();
  expect(topic.topicName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::SNS::Topic", 1);
});

test("snsTopic: topic name does not end in .fifo", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    snsTopic: {
      topicName: "mytopic",
      fifo: true,
    },
  });
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "mytopic.fifo",
  });
});

test("snsTopic: topic name ends in .fifo", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    snsTopic: {
      fifo: true,
    },
  });
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic.fifo",
  });
});

test("subscribers: Function string single", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::SNS::Topic", 1);
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers: Function strings multi", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::SNS::Topic", 1);
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers: Function construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Topic(stack, "Topic", {
    subscribers: [f],
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers: Function props", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [{ handler: "test/lambda.handler" }],
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers: Function with defaultFunctionProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    defaultFunctionProps: {
      timeout: 3,
      environment: {
        keyA: "valueA",
      },
    },
    subscribers: [{ handler: "test/lambda.handler" }],
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",

    Timeout: 3,
    Environment: {
      Variables: {
        keyA: "valueA",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  });
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
});

test("subscribers: TopicFunctionSubscriberProps", async () => {
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
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
  });
  hasResource(stack, "AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  });
  countResources(stack, "AWS::SNS::Subscription", 1);
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "lambda",
    FilterPolicy: { color: ["red", "orange"] },
  });
});

test("subscribers: Queue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  new Topic(stack, "Topic", {
    subscribers: [queue],
  });
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::SNS::Subscription", 1);
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "sqs",
  });
});

test("subscribers: TopicQueueSubscriberProps", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  new Topic(stack, "Topic", {
    subscribers: [
      {
        queue,
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
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::SNS::Subscription", 1);
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "sqs",
    FilterPolicy: { color: ["red", "orange"] },
  });
});

test("subscribers: empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [],
  });
  countResources(stack, "AWS::SNS::Topic", 1);
  countResources(stack, "AWS::SNS::Subscription", 0);
});

test("subscribers: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic");
  countResources(stack, "AWS::SNS::Topic", 1);
  countResources(stack, "AWS::SNS::Subscription", 0);
});

///////////////////
// Test Properties
///////////////////

test("snsSubscriptions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  const subscription = topic.snsSubscriptions[0];
  const cfnSub = subscription.node.defaultChild as sns.CfnSubscription;
  cfnSub.deliveryPolicy = {
    throttlePolicy: { maxReceivesPerSecond: 10 },
  };
  expect(topic.snsSubscriptions).toHaveLength(1);
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "lambda",
    DeliveryPolicy: {
      throttlePolicy: { maxReceivesPerSecond: 10 },
    },
  });
});

test("snsSubscriptions: with queue subscribers", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", queue],
  });

  const snsSubscriptions = topic.snsSubscriptions;

  expect(snsSubscriptions).toHaveLength(2);

  const subscription1 = snsSubscriptions[0];
  const subscription2 = snsSubscriptions[1];
  const cfnSub1 = subscription1.node.defaultChild as sns.CfnSubscription;
  const cfnSub2 = subscription2.node.defaultChild as sns.CfnSubscription;
  cfnSub1.deliveryPolicy = {
    throttlePolicy: { maxReceivesPerSecond: 10 },
  };
  cfnSub2.deliveryPolicy = {
    throttlePolicy: { maxReceivesPerSecond: 20 },
  };

  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "lambda",
    DeliveryPolicy: {
      throttlePolicy: { maxReceivesPerSecond: 10 },
    },
  });
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "sqs",
    DeliveryPolicy: {
      throttlePolicy: { maxReceivesPerSecond: 20 },
    },
  });
});

test("subscriberFunctions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  expect(topic.subscriberFunctions).toHaveLength(2);
  expect(topic.subscriberFunctions[0] instanceof Function).toBeTruthy();
  expect(topic.subscriberFunctions[1] instanceof Function).toBeTruthy();
});

test("subscriberFunctions: with queue subscribers", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", queue, "test/lambda.handler"],
  });
  expect(topic.subscriberFunctions).toHaveLength(2);
  expect(topic.subscriberFunctions[0] instanceof Function).toBeTruthy();
  expect(topic.subscriberFunctions[1] instanceof Function).toBeTruthy();
});

///////////////////
// Test Methods
///////////////////

test("addSubscribers: add function subscribers", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  topic.addSubscribers(stack, ["test/lambda.handler"]);
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "AWS::SNS::Topic", 1);
  countResources(stack, "AWS::SNS::Subscription", 2);
});

test("addSubscribers: add function subscribers for 2 topics", async () => {
  const stack = new Stack(new App(), "stack");
  const topicA = new Topic(stack, "TopicA");
  const topicB = new Topic(stack, "TopicB");
  expect(() => {
    topicA.addSubscribers(stack, ["test/lambda.handler"]);
    topicB.addSubscribers(stack, ["test/lambda.handler"]);
  }).not.toThrow();
  countResources(stack, "AWS::Lambda::Function", 2);
});

test("addSubscribers: add queue subscribers", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  topic.addSubscribers(stack, [queue]);
  countResources(stack, "AWS::Lambda::Function", 1);
  countResources(stack, "AWS::SNS::Topic", 1);
  countResources(stack, "AWS::SNS::Subscription", 2);
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "lambda",
  });
  hasResource(stack, "AWS::SNS::Subscription", {
    Protocol: "sqs",
  });
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  topic.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriberTopic0ServiceRoleDefaultPolicy09944443",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriberTopic1ServiceRoleDefaultPolicyCE1E856B",
  });
});

test("attachPermissionsToSubscriber", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  topic.attachPermissionsToSubscriber(0, ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriberTopic0ServiceRoleDefaultPolicy09944443",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriberTopic1ServiceRoleDefaultPolicyCE1E856B",
  });
});

test("attachPermissionsToSubscriber: attach to queue subscriber", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", queue],
  });
  expect(() => {
    topic.attachPermissionsToSubscriber(1, ["s3"]);
  }).toThrow(/Cannot attach permissions/);
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
  countResources(stackA, "AWS::SNS::Subscription", 1);
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriberTopic0ServiceRoleDefaultPolicy09944443",
  });
  countResources(stackB, "AWS::SNS::Subscription", 1);
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "SubscriberTopic1ServiceRoleDefaultPolicyBFA55355",
  });
});
