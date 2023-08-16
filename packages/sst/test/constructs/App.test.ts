import { test, expect } from "vitest";
import {
  ABSENT,
  ANY,
  arrayWith,
  countResources,
  countResourcesLike,
  createApp,
  hasResource,
  not,
  objectLike,
  templateMatches,
} from "./helper";
import { RemovalPolicy } from "aws-cdk-lib/core";
import { Stack, Bucket, Function, Queue, Topic } from "../../dist/constructs";

test("setDefaultRemovalPolicy(): not called", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  new Bucket(stack, "bucket");
  await app.finish();
  countResources(stack, "Custom::S3AutoDeleteObjects", 0);
  hasResource(stack, "AWS::S3::Bucket", {
    Tags: not(
      arrayWith([
        {
          Key: "aws-cdk:auto-delete-objects",
          Value: "true",
        },
      ])
    ),
  });
});
test("setDefaultRemovalPolicy(): DESTROY", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  app.setDefaultRemovalPolicy("destroy");
  new Bucket(stack, "bucket");
  await app.finish();
  countResources(stack, "Custom::S3AutoDeleteObjects", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    Tags: arrayWith([
      {
        Key: "aws-cdk:auto-delete-objects",
        Value: "true",
      },
    ]),
  });
});
test("setDefaultRemovalPolicy(): RETAIN", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  app.setDefaultRemovalPolicy("retain");
  new Bucket(stack, "bucket");
  await app.finish();
  countResources(stack, "Custom::S3AutoDeleteObjects", 0);
  hasResource(stack, "AWS::S3::Bucket", {
    Tags: not(
      arrayWith([
        {
          Key: "aws-cdk:auto-delete-objects",
          Value: "true",
        },
      ])
    ),
  });
});
test("setDefaultRemovalPolicy(): custom resource not created twice", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  app.setDefaultRemovalPolicy("destroy");
  new Bucket(stack, "bucket", {
    cdk: {
      bucket: {
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY,
      },
    },
  });
  await app.finish();
  countResources(stack, "Custom::S3AutoDeleteObjects", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    Tags: arrayWith([
      {
        Key: "aws-cdk:auto-delete-objects",
        Value: "true",
      },
    ]),
  });
});
