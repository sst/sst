import fs from "fs/promises";
import { test, expect, vi, beforeEach, afterAll } from "vitest";
import {
  countResources,
  hasResource,
  objectLike,
  ANY,
  createApp,
} from "./helper";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import { SsrSite } from "../../dist/constructs/SsrSite";
import { Api, Stack } from "../../dist/constructs";

process.env.SST_RESOURCES_TESTS = "enabled";

/////////////////////////////
// Test Constructor
/////////////////////////////

test("constructor: sst deploy inactive stack", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return false;
    },
  });
  const stack = new Stack(app, "stack");
  const site = new SsrSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst dev", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new SsrSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst remove", async () => {
  const app = await createApp({ mode: "remove" });
  const stack = new Stack(app, "stack");
  const site = new SsrSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});
