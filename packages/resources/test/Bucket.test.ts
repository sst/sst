import {
  expect as expectCdk,
  countResources,
  countResourcesLike,
  haveResource,
  objectLike,
} from "@aws-cdk/assert";
import * as s3 from "@aws-cdk/aws-s3";
import { App, Stack, Bucket, Function } from "../src";

const lambdaDefaultPolicy = {
  Action: ["xray:PutTraceSegments", "xray:PutTelemetryRecords"],
  Effect: "Allow",
  Resource: "*",
};

test("s3Bucket-is-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket");
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 0));
});

test("s3Bucket-is-s3BucketConstruct", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new s3.Bucket(stack, "T", {
    bucketName: "my-bucket",
  });
  new Bucket(stack, "Bucket", {
    s3Bucket: bucket,
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 0));
});

test("s3Bucket-is-s3BucketProps", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    s3Bucket: {
      bucketName: "my-bucket",
    },
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(
    haveResource("AWS::S3::Bucket", {
      BucketName: "my-bucket",
    })
  );
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 0));
});

/////////////////////////////
// Test notifications
/////////////////////////////

test("notifications-function-string-single", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: ["test/lambda.handler"],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "lambda.handler",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::Lambda::Function", {
      Description:
        'AWS CloudFormation handler for "Custom::S3BucketNotifications" resources (@aws-cdk/aws-s3)',
      Handler: "index.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 1));
  expectCdk(stack).to(
    haveResource("Custom::S3BucketNotifications", {
      BucketName: { Ref: "BucketD7FEB781" },
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          objectLike({ Events: ["s3:ObjectCreated:*"] }),
          objectLike({ Events: ["s3:ObjectRemoved:*"] }),
        ],
      },
    })
  );
});

test("notifications-function-string-multi", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: ["test/lambda.handler", "test/lambda.handler"],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 3));
  expectCdk(stack).to(
    countResourcesLike("AWS::Lambda::Function", 2, {
      Handler: "lambda.handler",
    })
  );
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 1));
  expectCdk(stack).to(
    haveResource("Custom::S3BucketNotifications", {
      BucketName: { Ref: "BucketD7FEB781" },
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          objectLike({ Events: ["s3:ObjectCreated:*"] }),
          objectLike({ Events: ["s3:ObjectRemoved:*"] }),
          objectLike({ Events: ["s3:ObjectCreated:*"] }),
          objectLike({ Events: ["s3:ObjectRemoved:*"] }),
        ],
      },
    })
  );
});

test("notifications-function-construct", async () => {
  const stack = new Stack(new App(), "stack");
  const f = new Function(stack, "Function", { handler: "test/lambda.handler" });
  new Bucket(stack, "Bucket", {
    notifications: [f],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 1));
  expectCdk(stack).to(
    haveResource("Custom::S3BucketNotifications", {
      BucketName: { Ref: "BucketD7FEB781" },
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          objectLike({ Events: ["s3:ObjectCreated:*"] }),
          objectLike({ Events: ["s3:ObjectRemoved:*"] }),
        ],
      },
    })
  );
});

test("notifications-function-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: [{ handler: "test/lambda.handler" }],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 1));
  expectCdk(stack).to(
    haveResource("Custom::S3BucketNotifications", {
      BucketName: { Ref: "BucketD7FEB781" },
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          objectLike({ Events: ["s3:ObjectCreated:*"] }),
          objectLike({ Events: ["s3:ObjectRemoved:*"] }),
        ],
      },
    })
  );
});

test("notifications-props", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: [
      {
        function: "test/lambda.handler",
        notificationProps: {
          events: [s3.EventType.OBJECT_CREATED_PUT],
          filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
        },
      },
    ],
  });
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 1));
  expectCdk(stack).to(
    haveResource("Custom::S3BucketNotifications", {
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
    })
  );
});

test("notifications-props-prefix-redefined", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new Bucket(stack, "Bucket", {
      notifications: [
        {
          function: "test/lambda.handler",
          notificationProps: {
            events: [s3.EventType.OBJECT_CREATED_PUT],
            filters: [
              { prefix: "imports/" },
              { prefix: "imports2/", suffix: ".jpg" },
            ],
          },
        },
      ],
    });
  }).toThrow(/Cannot specify more than one prefix rule in a filter./);
});

test("notifications-empty", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket", {
    notifications: [],
  });
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 0));
});

test("notifications-undefined", async () => {
  const stack = new Stack(new App(), "stack");
  new Bucket(stack, "Bucket");
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 0));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 0));
});

test("addNotifications", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket");
  bucket.addNotifications(stack, ["test/lambda.handler"]);
  expectCdk(stack).to(countResources("AWS::S3::Bucket", 1));
  expectCdk(stack).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stack).to(countResources("Custom::S3BucketNotifications", 1));
});

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    notifications: ["test/lambda.handler", "test/lambda.handler"],
  });
  bucket.attachPermissions(["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "BucketNotification0ServiceRoleDefaultPolicy0FB75AA1",
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
      PolicyName: "BucketNotification1ServiceRoleDefaultPolicyCFD5B06C",
    })
  );
});

test("attachPermissionsToNotification", async () => {
  const stack = new Stack(new App(), "stack");
  const bucket = new Bucket(stack, "Bucket", {
    notifications: ["test/lambda.handler", "test/lambda.handler"],
  });
  bucket.attachPermissionsToNotification(0, ["s3"]);
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "BucketNotification0ServiceRoleDefaultPolicy0FB75AA1",
    })
  );
  expectCdk(stack).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [lambdaDefaultPolicy],
        Version: "2012-10-17",
      },
      PolicyName: "BucketNotification1ServiceRoleDefaultPolicyCFD5B06C",
    })
  );
});

test("attachPermissions-after-addNotifications", async () => {
  const app = new App();
  const stackA = new Stack(app, "stackA");
  const stackB = new Stack(app, "stackB");
  const bucket = new Bucket(stackA, "Bucket", {
    notifications: ["test/lambda.handler"],
  });
  bucket.attachPermissions(["s3"]);
  bucket.addNotifications(stackB, ["test/lambda.handler"]);
  expectCdk(stackA).to(countResources("AWS::Lambda::Function", 2));
  expectCdk(stackA).to(countResources("Custom::S3BucketNotifications", 1));
  expectCdk(stackA).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "BucketNotification0ServiceRoleDefaultPolicy0FB75AA1",
    })
  );
  expectCdk(stackB).to(countResources("AWS::Lambda::Function", 1));
  expectCdk(stackB).to(countResources("Custom::S3BucketNotifications", 0));
  expectCdk(stackB).to(
    haveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          lambdaDefaultPolicy,
          { Action: "s3:*", Effect: "Allow", Resource: "*" },
        ],
        Version: "2012-10-17",
      },
      PolicyName: "Notification1ServiceRoleDefaultPolicy28074BBA",
    })
  );
});
