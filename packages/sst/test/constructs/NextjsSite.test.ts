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
import * as cf from "aws-cdk-lib/aws-cloudfront";
import { Stack, NextjsSite, NextjsSiteProps } from "../../dist/constructs";

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

async function createSite(
  props?: NextjsSiteProps | ((stack: Stack) => NextjsSiteProps)
) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const site = new NextjsSite(stack, "Site", {
    path: sitePath,
    buildCommand: "echo skip",
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, site };
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("default", async () => {
  const { stack, site } = await createSite();
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

test("default: check cache policy configured correctly", async () => {
  const { stack, site } = await createSite();
  countResources(stack, "AWS::CloudFront::CachePolicy", 1);
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      ParametersInCacheKeyAndForwardedToOrigin: objectLike({
        HeadersConfig: objectLike({
          Headers: [
            "accept",
            "rsc",
            "next-router-prefetch",
            "next-router-state-tree",
            "next-url",
          ],
        }),
      }),
    }),
  });
});

test("timeout defined", async () => {
  const { stack } = await createSite({
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
  const { stack, site } = await createSite({
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
  const { stack } = await createSite();
  hasResource(stack, "AWS::Lambda::Function", {
    Description: "Next.js revalidator",
    VpcConfig: ABSENT,
  });
});

test("cdk.revalidation.vpc: set", async () => {
  const { stack } = await createSite((stack) => ({
    cdk: {
      revalidation: {
        vpc: new Vpc(stack, "Vpc"),
      },
    },
  }));
  hasResource(stack, "AWS::Lambda::Function", {
    Description: "Next.js revalidator",
    VpcConfig: ANY,
  });
});
