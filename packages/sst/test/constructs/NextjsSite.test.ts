import { test, expect, beforeAll, vi } from "vitest";
import { execSync } from "child_process";
import {
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
  arrayWith,
  printResource,
  ANY,
  ABSENT,
  createApp,
} from "./helper.js";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Api, Stack, NextjsSite } from "../../dist/constructs";

process.env.SST_RESOURCES_TESTS = "enabled";
const sitePath = "test/constructs/nextjs-site";

beforeAll(async () => {
  // ℹ️ Uncomment the below to iterate faster on tests in vitest watch mode;
  // if (fs.pathExistsSync(path.join(sitePath, "node_modules"))) {
  //   return;
  // }

  // Install Next.js app dependencies
  execSync("npm install", {
    cwd: sitePath,
    stdio: "inherit",
  });
  // Build Next.js app
  execSync("npx --yes open-next@latest build", {
    cwd: sitePath,
    stdio: "inherit",
  });
});

/////////////////////////////
// Test Constructor
/////////////////////////////

test("default", async () => {
  const stack = new Stack(await createApp(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: sitePath,
    buildCommand: "echo skip",
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk?.bucket.bucketArn).toBeDefined();
  expect(site.cdk?.bucket.bucketName).toBeDefined();
  expect(site.cdk?.distribution.distributionId).toBeDefined();
  expect(site.cdk?.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk?.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
});

test("timeout defined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new NextjsSite(stack, "Site", {
    path: sitePath,
    buildCommand: "echo skip",
    timeout: 100,
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Origins: arrayWith([
        objectLike({
          CustomOriginConfig: objectLike({
            OriginReadTimeout: 100,
          }),
        }),
      ]),
    }),
  });
});

test("cdk.distribution.defaultBehavior", async () => {
  const stack = new Stack(await createApp(), "stack");
  new NextjsSite(stack, "Site", {
    path: sitePath,
    buildCommand: "echo skip",
    cdk: {
      distribution: {
        defaultBehavior: {
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
        },
      },
    },
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        ViewerProtocolPolicy: "https-only",
      }),
    }),
  });
});

test("cdk.revalidation.vpc: not set", async () => {
  const stack = new Stack(await createApp(), "stack");
  new NextjsSite(stack, "Site", {
    path: sitePath,
    buildCommand: "echo skip",
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Description: "Next.js revalidator",
    VpcConfig: ABSENT,
  });
});

test("cdk.revalidation.vpc: set", async () => {
  const stack = new Stack(await createApp(), "stack");
  new NextjsSite(stack, "Site", {
    path: sitePath,
    buildCommand: "echo skip",
    cdk: {
      revalidation: {
        vpc: new Vpc(stack, "Vpc"),
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Description: "Next.js revalidator",
    VpcConfig: ANY,
  });
});
