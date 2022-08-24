#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {
  Bootstrap,
} from "@serverless-stack/core";

const region = process.argv[2];
const tags = JSON.parse(Buffer.from(process.argv[3], "base64").toString());

// Create CDK App
const app = new cdk.App();
const stack = new cdk.Stack(app, "SSTBootstrap", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region,
  },
});

// Tag resources
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

const bucket = createS3Bucket();
createSsmParams({
  [Bootstrap.SSM_NAME_VERSION]: Bootstrap.LATEST_VERSION,
  [Bootstrap.SSM_NAME_STACK_NAME]: stack.stackName,
  [Bootstrap.SSM_NAME_BUCKET_NAME]: bucket.bucketName,
});

function createS3Bucket() {
  return new s3.Bucket(stack, region, {
    encryption: s3.BucketEncryption.S3_MANAGED,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  });
}

function createSsmParams(data) {
  Object.keys(data).forEach(key => {
    new ssm.StringParameter(stack, key, {
      parameterName: key,
      stringValue: data[key],
      description: `SST Bootstrap Stack ${key}`,
      tier: ssm.ParameterTier.STANDARD,
    });
  });
}