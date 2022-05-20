import { test, expect } from "vitest";
import {
  ABSENT,
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
} from "./helper";
import * as s3 from "aws-cdk-lib/aws-s3";
import { App, Stack, Bucket, Function, Queue, Topic } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

test("constructor: cdk.bucket is undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket");
  expect(bucket.bucketArn).toBeDefined();
  expect(bucket.bucketName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "Custom::S3BucketNotifications", 0);
});

test("constructor: cdk.bucket is imported construct", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    cdk: {
      bucket: s3.Bucket.fromBucketArn(stack, "T", "arn:aws:s3:::my-bucket"),
    },
  });
  expect(bucket.bucketArn).toBeDefined();
  expect(bucket.bucketName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::S3::Bucket", 0);
  countResources(stack, "Custom::S3BucketNotifications", 0);
});

test("constructor: cdk.bucket is created construct", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    cdk: {
      bucket: new s3.Bucket(stack, "T", { bucketName: "my-bucket" }),
    },
  });
  expect(bucket.bucketArn).toBeDefined();
  expect(bucket.bucketName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "Custom::S3BucketNotifications", 0);
});

test("constructor: cdk.bucket is props", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    cdk: {
      bucket: {
        bucketName: "my-bucket",
      },
    },
  });
  expect(bucket.bucketArn).toBeDefined();
  expect(bucket.bucketName).toBeDefined();
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "AWS::S3::Bucket", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    BucketName: "my-bucket",
  });
  countResources(stack, "Custom::S3BucketNotifications", 0);
});

test("cors: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket");
  hasResource(stack, "AWS::S3::Bucket", {
    CorsConfiguration: ABSENT,
  });
});

test("cors: false", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket");
  hasResource(stack, "AWS::S3::Bucket", {
    CorsConfiguration: ABSENT,
  });
});

test("cors: defined", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["https://domain.com"],
      },
    ],
  });
  hasResource(stack, "AWS::S3::Bucket", {
    CorsConfiguration: {
      CorsRules: [
        {
          AllowedMethods: ["GET"],
          AllowedOrigins: ["https://domain.com"],
        },
      ],
    },
  });
});

test("cors: true", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    cors: true,
  });
  hasResource(stack, "AWS::S3::Bucket", {
    CorsConfiguration: {
      CorsRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "HEAD", "POST", "DELETE"],
          AllowedOrigins: ["*"],
        },
      ],
    },
  });
});

/////////////////////////////
// Test notifications
/////////////////////////////

test("notifications: empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: {},
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "Custom::S3BucketNotifications", 0);
});

test("notifications: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket");
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 0);
  countResources(stack, "Custom::S3BucketNotifications", 0);
});

test("notifications: function is string", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 10,
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Description:
      'AWS CloudFormation handler for "Custom::S3BucketNotifications" resources (@aws-cdk/aws-s3)',
    Handler: "index.handler",
    Timeout: 300,
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "Custom::S3BucketNotifications", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      LambdaFunctionConfigurations: [
        objectLike({ Events: ["s3:ObjectCreated:*"] }),
        objectLike({ Events: ["s3:ObjectRemoved:*"] }),
      ],
    },
  });
});

test("notifications: function is string with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": "test/lambda.handler",
    },
    defaults: {
      function: {
        timeout: 3,
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  hasResource(stack, "AWS::Lambda::Function", {
    Handler: "test/lambda.handler",
    Timeout: 3,
  });
});

test("notifications: function is multi string", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": "test/lambda.handler",
      "1": "test/lambda.handler",
    },
  });
  countResources(stack, "AWS::Lambda::Function", 3);
  countResourcesLike(stack, "AWS::Lambda::Function", 2, {
    Handler: "test/lambda.handler",
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "Custom::S3BucketNotifications", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      LambdaFunctionConfigurations: [
        objectLike({ Events: ["s3:ObjectCreated:*"] }),
        objectLike({ Events: ["s3:ObjectRemoved:*"] }),
        objectLike({ Events: ["s3:ObjectCreated:*"] }),
        objectLike({ Events: ["s3:ObjectRemoved:*"] }),
      ],
    },
  });
});

test("notifications: function is construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": f,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "Custom::S3BucketNotifications", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      LambdaFunctionConfigurations: [
        objectLike({ Events: ["s3:ObjectCreated:*"] }),
        objectLike({ Events: ["s3:ObjectRemoved:*"] }),
      ],
    },
  });
});

test("notifications: function is construct with defaults.function", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  expect(() => {
    new Bucket(stack, "Bucket", {
      notifications: {
        "0": f,
      },
      defaults: {
        function: {
          timeout: 3,
        },
      },
    });
  }).toThrow(/The "defaults.function" cannot be applied/);
});

test("notifications: BucketFunctionNotificationProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": {
        function: "test/lambda.handler",
        events: ["object_created_put"],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "Custom::S3BucketNotifications", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      LambdaFunctionConfigurations: [
        objectLike({
          Events: ["s3:ObjectCreated:Put"],
          Filter: {
            Key: {
              FilterRules: [
                { Name: "prefix", Value: "imports/" },
                { Name: "suffix", Value: ".jpg" },
              ],
            },
          },
        }),
      ],
    },
  });
});

test("notifications: BucketFunctionNotificationProps prefix redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Bucket(stack, "Bucket", {
      notifications: {
        "0": {
          function: "test/lambda.handler",
          events: ["object_created_put"],
          filters: [
            { prefix: "imports/" },
            { prefix: "imports2/", suffix: ".jpg" },
          ],
        },
      },
    });
  }).toThrow(/Cannot specify more than one prefix rule in a filter./);
});

test("notifications: Queue", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": queue,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Description:
      'AWS CloudFormation handler for "Custom::S3BucketNotifications" resources (@aws-cdk/aws-s3)',
    Handler: "index.handler",
    Timeout: 300,
  });
  countResources(stack, "AWS::SQS::Queue", 1);
  countResources(stack, "AWS::SQS::QueuePolicy", 1);
  hasResource(stack, "AWS::SQS::QueuePolicy", {
    PolicyDocument: objectLike({
      Statement: [
        objectLike({
          Principal: {
            Service: "s3.amazonaws.com",
          },
        }),
      ],
    }),
  });
  countResources(stack, "Custom::S3BucketNotifications", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      QueueConfigurations: [
        objectLike({ Events: ["s3:ObjectCreated:*"] }),
        objectLike({ Events: ["s3:ObjectRemoved:*"] }),
      ],
    },
  });
});

test("notifications: BucketQueueNotificationProps", async () => {
  const stack = new Stack(new App(), "stack");
  const queue = new Queue(stack, "Queue");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": {
        type: "queue",
        queue,
        events: ["object_created_put"],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      QueueConfigurations: [
        objectLike({
          Events: ["s3:ObjectCreated:Put"],
          Filter: {
            Key: {
              FilterRules: [
                { Name: "prefix", Value: "imports/" },
                { Name: "suffix", Value: ".jpg" },
              ],
            },
          },
        }),
      ],
    },
  });
});

test("notifications: Topic", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": topic,
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "AWS::Lambda::Function", {
    Description:
      'AWS CloudFormation handler for "Custom::S3BucketNotifications" resources (@aws-cdk/aws-s3)',
    Handler: "index.handler",
    Timeout: 300,
  });
  countResources(stack, "AWS::SNS::Topic", 1);
  countResources(stack, "AWS::SNS::TopicPolicy", 1);
  hasResource(stack, "AWS::SNS::TopicPolicy", {
    PolicyDocument: objectLike({
      Statement: [
        objectLike({
          Principal: {
            Service: "s3.amazonaws.com",
          },
        }),
      ],
    }),
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "Custom::S3BucketNotifications", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      TopicConfigurations: [
        objectLike({ Events: ["s3:ObjectCreated:*"] }),
        objectLike({ Events: ["s3:ObjectRemoved:*"] }),
      ],
    },
  });
});

test("notifications: BucketTopicNotificationProps", async () => {
  const stack = new Stack(new App(), "stack");
  const topic = new Topic(stack, "Topic");
  new Bucket(stack, "Bucket", {
    notifications: {
      "0": {
        type: "topic",
        topic,
        events: ["object_created_put"],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      },
    },
  });
  countResources(stack, "AWS::Lambda::Function", 1);
  hasResource(stack, "Custom::S3BucketNotifications", {
    BucketName: { Ref: "BucketD7FEB781" },
    NotificationConfiguration: {
      TopicConfigurations: [
        objectLike({
          Events: ["s3:ObjectCreated:Put"],
          Filter: {
            Key: {
              FilterRules: [
                { Name: "prefix", Value: "imports/" },
                { Name: "suffix", Value: ".jpg" },
              ],
            },
          },
        }),
      ],
    },
  });
});

/////////////////////////////
// Test methods
/////////////////////////////

test("addNotifications", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket");
  bucket.addNotifications(stack, {
    "0": "test/lambda.handler",
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 2);
  countResources(stack, "Custom::S3BucketNotifications", 1);
});

test("addNotifications: add function notifications for 2 buckets", async () => {
  const stack = new Stack(new App(), "stack");
  const bucketA = new Bucket(stack, "BucketA");
  const bucketB = new Bucket(stack, "BucketB");
  expect(() => {
    bucketA.addNotifications(stack, {
      "0": "test/lambda.handler",
    });
    bucketB.addNotifications(stack, {
      "0": "test/lambda.handler",
    });
  }).not.toThrow();
  countResources(stack, "AWS::Lambda::Function", 3);
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    notifications: {
      "0": "test/lambda.handler",
      "1": "test/lambda.handler",
    },
  });
  bucket.attachPermissions(["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "BucketNotificationBucket0ServiceRoleDefaultPolicyA97DEDCD",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "BucketNotificationBucket1ServiceRoleDefaultPolicy28968457",
  });
});

test("attachPermissionsToNotification", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    notifications: {
      "0": "test/lambda.handler",
      "1": "test/lambda.handler",
    },
  });
  bucket.attachPermissionsToNotification("0", ["s3"]);
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "BucketNotificationBucket0ServiceRoleDefaultPolicyA97DEDCD",
  });
  hasResource(stack, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [lambdaDefaultPolicy],
      Version: "2012-10-17",
    },
    PolicyName: "BucketNotificationBucket1ServiceRoleDefaultPolicy28968457",
  });
});

test("attachPermissions-after-addNotifications", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const bucket = new Bucket(stackA, "Bucket", {
    notifications: {
      "0": "test/lambda.handler",
    },
  });
  bucket.attachPermissions(["s3"]);
  bucket.addNotifications(stackB, {
    "1": "test/lambda.handler",
  });
  countResources(stackA, "AWS::Lambda::Function", 2);
  countResources(stackA, "Custom::S3BucketNotifications", 1);
  hasResource(stackA, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "BucketNotificationBucket0ServiceRoleDefaultPolicyA97DEDCD",
  });
  countResources(stackB, "AWS::Lambda::Function", 1);
  countResources(stackB, "Custom::S3BucketNotifications", 0);
  hasResource(stackB, "AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        lambdaDefaultPolicy,
        { Action: "s3:*", Effect: "Allow", Resource: "*" },
      ],
      Version: "2012-10-17",
    },
    PolicyName: "NotificationBucket1ServiceRoleDefaultPolicyD9CB4189",
  });
});
