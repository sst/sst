import { test, expect, beforeAll, vi } from "vitest";
import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";
import {
  countResources,
  countResourcesLike,
  hasResource,
  objectLike,
  arrayWith,
  ANY,
  ABSENT,
} from "./helper";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { App, Api, Stack, NextjsSite } from "../src";

const sitePath = "test/nextjs-site";
const sitePathMinimalFeatures = "test/nextjs-site-minimal-features";
const buildOutputPath = path.join(".build", "nextjs-output");

beforeAll(async () => {
  // Instal Next.js app dependencies
  execSync("npm install", {
    cwd: sitePath,
    stdio: "inherit",
  });
  execSync("npm install", {
    cwd: sitePathMinimalFeatures,
    stdio: "inherit",
  });

  // Build Next.js app
  fs.removeSync(path.join(__dirname, "..", buildOutputPath));
  const configBuffer = Buffer.from(
    JSON.stringify({
      cwd: path.join(__dirname, "..", sitePath),
      args: ["build"],
    })
  );
  const cmd = [
    "node",
    path.join(__dirname, "../assets/NextjsSite/build/build.cjs"),
    "--path",
    path.join(__dirname, "..", sitePath),
    "--output",
    path.join(__dirname, "..", buildOutputPath),
    "--config",
    configBuffer.toString("base64"),
  ].join(" ");
  execSync(cmd, {
    cwd: path.join(__dirname, "..", sitePath),
    stdio: "inherit",
  });
});

test("constructor: us-east-1", async () => {
  const app = new App({ region: "us-east-1" });
  const stack = new Stack(app, "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 10);
  countResources(stack, "AWS::Lambda::Version", 3);
  countResources(stack, "AWS::Lambda::Alias", 3);
  hasResource(stack, "AWS::Lambda::Alias", {
    FunctionName: { Ref: "SiteMainFunction17342A54" },
    FunctionVersion: ANY,
    Name: "live",
  });
  hasResource(stack, "AWS::Lambda::Alias", {
    FunctionName: { Ref: "SiteApiFunction5F34A346" },
    FunctionVersion: ANY,
    Name: "live",
  });
  hasResource(stack, "AWS::Lambda::Alias", {
    FunctionName: { Ref: "SiteImageFunction6C3177FC" },
    FunctionVersion: ANY,
    Name: "live",
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  countResources(stack, "Custom::SSTEdgeLambdaBucket", 0);
  countResources(stack, "Custom::SSTEdgeLambda", 0);
  countResources(stack, "Custom::SSTEdgeLambdaVersion", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 1);
  countResources(stack, "Custom::SSTLambdaCodeUpdater", 4);
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
});

test("constructor: ca-central-1", async () => {
  const app = new App({ region: "ca-central-1" });
  const stack = new Stack(app, "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 9);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  countResources(stack, "Custom::SSTEdgeLambdaBucket", 1);
  countResources(stack, "Custom::SSTEdgeLambda", 3);
  countResources(stack, "Custom::SSTEdgeLambdaVersion", 3);
  countResources(stack, "Custom::SSTBucketDeployment", 1);
  countResources(stack, "Custom::SSTLambdaCodeUpdater", 4);
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
});