import {
  expect as expectCdk,
  countResources,
  haveResource,
} from "@aws-cdk/assert";
import * as sns from "@aws-cdk/aws-sns";
import { App, Stack, Topic, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

///////////////////
// Test Constructor
///////////////////

test("snsTopic-is-snsTopicConstruct", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new sns.Topic(stack, "T", {
    topicName: "my-topic",
  });
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
    snsTopic: topic,
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  }));
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "my-topic",
  }));
});

test("snsTopic-is-snsTopicProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    snsTopic: {
      topicName: "my-topic",
    },
    subscribers: ["test/lambda.handler"],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
});

test("subscribers-function-string-single", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  }));
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  }));
});

test("subscribers-function-string-multi", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  }));
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  }));
});

test("subscribers-function-construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Topic(stack, "Topic", {
    subscribers: [f],
  });
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  }));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  }));
});

test("subscribers-function-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [{ handler: "test/lambda.handler" }],
  });
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  }));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  }));
});

test("subscribers-function-with-defaultFunctionProps", async () => {
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
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
    Timeout: 3,
    Environment: {
      Variables: {
        keyA: "valueA",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    },
  }));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  }));
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
  expectCdk(stack).to(haveResource("AWS::Lambda::Function", {
    Handler: "lambda.handler",
  }));
  expectCdk(stack).to(haveResource("AWS::SNS::Topic", {
    TopicName: "dev-my-app-Topic",
  }));
  expectCdk(stack).to(countResources("AWS::SNS::Subscription", 1));
  expectCdk(stack).to(haveResource("AWS::SNS::Subscription", {
    FilterPolicy: { color: ["red", "orange"] },
  }));
});

test("subscribers-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic", {
    subscribers: [],
  });
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
  expectCdk(stack).to(countResources("AWS::SNS::Subscription", 0));
});

test("subscribers-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Topic(stack, "Topic");
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
  expectCdk(stack).to(countResources("AWS::SNS::Subscription", 0));
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
    throttlePolicy: { "maxReceivesPerSecond": 10 }
  };
  expect(topic.snsSubscriptions).toHaveLength(1);
  expectCdk(stack).to(haveResource("AWS::SNS::Subscription", {
    DeliveryPolicy: {
      throttlePolicy: { "maxReceivesPerSecond": 10 }
    },
  }));
});


///////////////////
// Test Methods
///////////////////

test("addSubscribers", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler"],
  });
  topic.addSubscribers(stack, ["test/lambda.handler"]);
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("AWS::SNS::Topic", 1));
  expectCdk(stack).to(countResources("AWS::SNS::Subscription", 2));
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  topic.attachPermissions(["s3"]);
  expectCdk(stack).to(haveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber0ServiceRoleDefaultPolicyB81AA9BE",
  }));
  expectCdk(stack).to(haveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber1ServiceRoleDefaultPolicyA0E825CD",
  }));
});

test("attachPermissionsToSubscriber", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic", {
    subscribers: ["test/lambda.handler", "test/lambda.handler"],
  });
  topic.attachPermissionsToSubscriber(0, ["s3"]);
  expectCdk(stack).to(haveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber0ServiceRoleDefaultPolicyB81AA9BE",
  }));
  expectCdk(stack).to(haveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber1ServiceRoleDefaultPolicyA0E825CD",
  }));
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
  expectCdk(stackA).to(countResources("AWS::SNS::Subscription", 1));
  expectCdk(stackA).to(haveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "TopicSubscriber0ServiceRoleDefaultPolicyB81AA9BE",
  }));
  expectCdk(stackB).to(countResources("AWS::SNS::Subscription", 1));
  expectCdk(stackB).to(haveResource("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "Subscriber1ServiceRoleDefaultPolicy1E5C9A05",
  }));
});
