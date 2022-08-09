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

/////////////////////////////
// Test Constructor
/////////////////////////////

test("constructor: no domain", async () => {
  const stack = new Stack(new App(), "stack");
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
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      CacheBehaviors: [
        {
          AllowedMethods: [
            "GET",
            "HEAD",
            "OPTIONS",
            "PUT",
            "PATCH",
            "POST",
            "DELETE",
          ],
          CachePolicyId: {
            Ref: "SiteImageCache3A336C80",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          LambdaFunctionAssociations: [
            {
              EventType: "origin-request",
              LambdaFunctionARN: ANY,
            },
          ],
          OriginRequestPolicyId: {
            Ref: "SiteImageOriginRequestFA9A64F5",
          },
          PathPattern: "_next/image*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteLambdaCacheD9743183",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          LambdaFunctionAssociations: [
            {
              EventType: "origin-request",
              IncludeBody: true,
              LambdaFunctionARN: ANY,
            },
            {
              EventType: "origin-response",
              LambdaFunctionARN: ANY,
            },
          ],
          PathPattern: "_next/data/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteStaticsCache29AFAE7C",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "_next/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteStaticsCache29AFAE7C",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "static/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: [
            "GET",
            "HEAD",
            "OPTIONS",
            "PUT",
            "PATCH",
            "POST",
            "DELETE",
          ],
          CachePolicyId: {
            Ref: "SiteLambdaCacheD9743183",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          LambdaFunctionAssociations: [
            {
              EventType: "origin-request",
              IncludeBody: true,
              LambdaFunctionARN: ANY,
            },
          ],
          PathPattern: "api/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
      ],
      DefaultCacheBehavior: {
        AllowedMethods: ["GET", "HEAD", "OPTIONS"],
        CachePolicyId: {
          Ref: "SiteLambdaCacheD9743183",
        },
        CachedMethods: ["GET", "HEAD", "OPTIONS"],
        Compress: true,
        LambdaFunctionAssociations: [
          {
            EventType: "origin-request",
            IncludeBody: true,
            LambdaFunctionARN: ANY,
          },
          {
            EventType: "origin-response",
            LambdaFunctionARN: ANY,
          },
        ],
        TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
        ViewerProtocolPolicy: "redirect-to-https",
      },
      DefaultRootObject: "",
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Origins: [
        {
          DomainName: {
            "Fn::GetAtt": ["SiteS3Bucket43E5BB2F", "RegionalDomainName"],
          },
          Id: "devmyappstackSiteDistributionOrigin1F25265FA",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "SiteDistributionOrigin1S3Origin76FD4338",
                  },
                ],
              ],
            },
          },
        },
      ],
    },
  });
  countResources(stack, "AWS::Route53::RecordSet", 0);
  countResources(stack, "AWS::Route53::HostedZone", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 1);
  hasResource(stack, "Custom::SSTBucketDeployment", {
    Sources: [
      {
        BucketName: ANY,
        ObjectKey: ANY,
      },
    ],
    DestinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
    FileOptions: [
      [
        "--exclude",
        "*",
        "--include",
        "public/*",
        "--cache-control",
        "public,max-age=31536000,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "static/*",
        "--cache-control",
        "public,max-age=31536000,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "static-pages/*",
        "--cache-control",
        "public,max-age=0,s-maxage=2678400,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "_next/data/*",
        "--cache-control",
        "public,max-age=0,s-maxage=2678400,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "_next/static/*",
        "--cache-control",
        "public,max-age=31536000,immutable",
      ],
    ],
    ReplaceValues: [],
  });
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
  hasResource(stack, "Custom::SSTCloudFrontInvalidation", {
    DistributionPaths: ["/*"],
  });
});

test("constructor: with domain", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: "domain.com",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeDefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Aliases: ["domain.com"],
    }),
  });
  countResources(stack, "AWS::Route53::RecordSet", 2);
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "A",
    AliasTarget: {
      DNSName: {
        "Fn::GetAtt": ["SiteDistribution390DED28", "DomainName"],
      },
      HostedZoneId: {
        "Fn::FindInMap": [
          "AWSCloudFrontPartitionHostedZoneIdMap",
          {
            Ref: "AWS::Partition",
          },
          "zoneId",
        ],
      },
    },
    HostedZoneId: {
      Ref: "SiteHostedZone0E1602DC",
    },
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "AAAA",
    AliasTarget: {
      DNSName: {
        "Fn::GetAtt": ["SiteDistribution390DED28", "DomainName"],
      },
      HostedZoneId: {
        "Fn::FindInMap": [
          "AWSCloudFrontPartitionHostedZoneIdMap",
          {
            Ref: "AWS::Partition",
          },
          "zoneId",
        ],
      },
    },
    HostedZoneId: {
      Ref: "SiteHostedZone0E1602DC",
    },
  });
  countResources(stack, "AWS::Route53::HostedZone", 1);
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("constructor: with domain with alias", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeDefined();
  countResources(stack, "AWS::S3::Bucket", 2);
  hasResource(stack, "AWS::S3::Bucket", {
    WebsiteConfiguration: {
      RedirectAllRequestsTo: {
        HostName: "domain.com",
        Protocol: "https",
      },
    },
  });
  countResources(stack, "AWS::CloudFront::Distribution", 2);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Aliases: ["www.domain.com"],
    }),
  });
  countResources(stack, "AWS::Route53::RecordSet", 4);
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "AAAA",
  });
  countResources(stack, "AWS::Route53::HostedZone", 1);
});

test("customDomain: string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: "domain.com",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://domain.com");
  hasResource(stack, "AWS::CloudFormation::CustomResource", {
    DomainName: "domain.com",
    Region: "us-east-1",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: domainName string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "domain.com",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://domain.com");
  hasResource(stack, "AWS::CloudFormation::CustomResource", {
    DomainName: "domain.com",
    Region: "us-east-1",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: hostedZone string", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  hasResource(stack, "AWS::CloudFormation::CustomResource", {
    DomainName: "www.domain.com",
    Region: "us-east-1",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: hostedZone construct", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        hostedZone: route53.HostedZone.fromLookup(stack, "HostedZone", {
          domainName: "domain.com",
        }),
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(route53.HostedZone.fromLookup).toHaveBeenCalledTimes(1);
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  hasResource(stack, "AWS::CloudFormation::CustomResource", {
    DomainName: "www.domain.com",
    Region: "us-east-1",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: certificate imported", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  countResources(stack, "AWS::CloudFormation::CustomResource", 0);
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "A",
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "www.domain.com.",
    Type: "AAAA",
  });
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: isExternalDomain true", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
      isExternalDomain: true,
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  expect(site.customDomainUrl).toEqual("https://www.domain.com");
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Aliases: ["www.domain.com"],
    }),
  });
  countResources(stack, "AWS::CloudFormation::CustomResource", 0);
  countResources(stack, "AWS::Route53::HostedZone", 0);
  countResources(stack, "AWS::Route53::RecordSet", 0);
});

test("customDomain: isExternalDomain true and no certificate", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
      sstTestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and domainAlias set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      customDomain: {
        domainName: "domain.com",
        domainAlias: "www.domain.com",
        cdk: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
        isExternalDomain: true,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
      sstTestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(
    /Domain alias is only supported for domains hosted on Amazon Route 53/
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      customDomain: {
        domainName: "www.domain.com",
        hostedZone: "domain.com",
        cdk: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
        isExternalDomain: true,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
      sstTestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("commandHooks: afterBuild success", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
    commandHooks: {
      afterBuild: ["echo hi"]
    }
  });
  expect(site.url).toBeDefined();
});

test("commandHooks: afterBuild failed", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
      sstTestBuildOutputPath: buildOutputPath,
      commandHooks: {
        afterBuild: ["garbage"]
      }
    });
  }).toThrow();
});

test("constructor: path not exist", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "does-not-exist",
    });
  }).toThrow(/No path found/);
});

test("constructor: skipbuild doesn't expect path", async () => {
  const stack = new Stack(
    new App({
      skipBuild: true,
    }),
    "stack"
  );
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "does-not-exist",
    });
  }).not.toThrow(/No path found/);
});

test("cdk.bucket is props", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      bucket: {
        bucketName: "my-bucket",
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    BucketName: "my-bucket",
  });
});

test("cdk.bucket is construct", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::S3::Bucket", 0);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Origins: [
        objectLike({
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "SiteDistributionOrigin1S3Origin76FD4338",
                  },
                ],
              ],
            },
          },
        }),
      ],
    }),
  });
  hasResource(stack, "Custom::SSTBucketDeployment", {
    DestinationBucketName: "my-bucket",
  });
});

test("constructor: sqsRegenerationQueue props", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      regenerationQueue: {
        deliveryDelay: cdk.Duration.seconds(30),
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::SQS::Queue", 1);
  hasResource(stack, "AWS::SQS::Queue", {
    DelaySeconds: 30,
  });
});

test("constructor: cfCachePolicies props default", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 3);
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST NextjsSite Image Default Cache Policy",
    }),
  });
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST NextjsSite Lambda Default Cache Policy",
    }),
  });
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST NextjsSite Static Default Cache Policy",
    }),
  });
});

test("constructor: cfCachePolicies props override", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      cachePolicies: {
        imageCachePolicy: cf.CachePolicy.fromCachePolicyId(
          stack,
          "ImageCachePolicy",
          "imageCachePolicyId"
        ),
        lambdaCachePolicy: cf.CachePolicy.fromCachePolicyId(
          stack,
          "LambdaCachePolicy",
          "lambdaCachePolicyId"
        ),
        staticCachePolicy: cf.CachePolicy.fromCachePolicyId(
          stack,
          "StaticCachePolicy",
          "staticCachePolicyId"
        ),
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 0);
});

test("constructor: cfImageOriginRequestPolicy props default", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::CloudFront::OriginRequestPolicy", 1);
  hasResource(stack, "AWS::CloudFront::OriginRequestPolicy", {
    OriginRequestPolicyConfig: objectLike({
      Comment: "SST NextjsSite Lambda Default Origin Request Policy",
    }),
  });
});

test("constructor: cfImageOriginRequestPolicy props override", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      imageOriginRequestPolicy:
        cf.OriginRequestPolicy.fromOriginRequestPolicyId(
          stack,
          "ImageOriginRequestPolicy",
          "imageOriginRequestPolicyId"
        ),
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::CloudFront::OriginRequestPolicy", 0);
});

test("constructor: cfDistribution props", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      distribution: {
        comment: "My Comment",
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Comment: "My Comment",
    }),
  });
});

test("constructor: cfDistribution defaultBehavior override", async () => {
  const stack = new Stack(new App(), "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    cdk: {
      distribution: {
        defaultBehavior: {
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        ViewerProtocolPolicy: "https-only",
        AllowedMethods: [
          "GET",
          "HEAD",
          "OPTIONS",
          "PUT",
          "PATCH",
          "POST",
          "DELETE",
        ],
      }),
    }),
  });
});

test("constructor: cfDistribution certificate conflict", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      cdk: {
        distribution: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
      sstTestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(/Do not configure the "cfDistribution.certificate"/);
});

test("constructor: cfDistribution domainNames conflict", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new NextjsSite(stack, "Site", {
      path: "test/nextjs-site",
      cdk: {
        distribution: {
          domainNames: ["domain.com"],
        },
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
      sstTestBuildOutputPath: buildOutputPath,
    });
  }).toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

test("constructor: environment generates placeholders", async () => {
  // Note: Build for real, do not use sstTestBuildOutputPath

  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    environment: {
      CONSTANT_ENV: "my-url",
      REFERENCE_ENV: api.url,
    },
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: "site.buildOutDir" not exposed in props
  const buildOutDir = site.buildOutDir || "";
  const buildId = fs
    .readFileSync(path.join(buildOutDir, "assets", "BUILD_ID"))
    .toString()
    .trim();
  const html = fs.readFileSync(
    path.join(buildOutDir, "assets", "static-pages", buildId, "env.html")
  );

  // test constant values are replaced with actual values
  expect(html.toString().indexOf("{{ CONSTANT_ENV }}") > -1).toBeFalsy();
  expect(html.toString().indexOf("my-url") > -1).toBeTruthy();

  // test reference values are replaced with placeholder
  expect(html.toString().indexOf("{{ REFERENCE_ENV }}") > -1).toBeTruthy();

  hasResource(stack, "Custom::SSTBucketDeployment", {
    ReplaceValues: [
      {
        files: "**/*.html",
        search: "{{ REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.js",
        search: "{{ REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.json",
        search: "{{ REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
    ],
  });

  countResourcesLike(stack, "Custom::SSTLambdaCodeUpdater", 4, {
    ReplaceValues: [
      {
        files: "**/*.html",
        search: "{{ CONSTANT_ENV }}",
        replace: "my-url",
      },
      {
        files: "**/*.js",
        search: "{{ CONSTANT_ENV }}",
        replace: "my-url",
      },
      {
        files: "**/*.json",
        search: "{{ CONSTANT_ENV }}",
        replace: "my-url",
      },
      {
        files: "**/*.html",
        search: "{{ REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.js",
        search: "{{ REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.json",
        search: "{{ REFERENCE_ENV }}",
        replace: { "Fn::GetAtt": ANY },
      },
      {
        files: "**/*.js",
        search: '"{{ _SST_NEXTJS_SITE_ENVIRONMENT_ }}"',
        replace: {
          "Fn::Join": [
            "",
            [
              '{"CONSTANT_ENV":"my-url","REFERENCE_ENV":"',
              { "Fn::GetAtt": ANY },
              '"}',
            ],
          ],
        },
      },
    ],
  });
});

test("constructor: minimal feature (empty api lambda)", async () => {
  // Note: Build for real, do not use sstTestBuildOutputPath

  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: sitePathMinimalFeatures,
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: "site.buildOutDir" not exposed in props
  const buildOutDir = site.buildOutDir || "";

  // Verify "image-lambda" and "api-lambda" do not exist
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "default-lambda", "index.js"))
  ).toBeTruthy();
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "regeneration-lambda", "index.js"))
  ).toBeTruthy();
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "image-lambda", "index.js"))
  ).toBeFalsy();
  expect(
    fs.pathExistsSync(path.join(buildOutDir, "api-lambda", "index.js"))
  ).toBeFalsy();
  countResources(stack, "AWS::Lambda::Function", 10);
});

/////////////////////////////
// Test Constructor for non-us-east-1 region
/////////////////////////////

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

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: local debug", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
  });
  countResources(stack, "Custom::SSTBucketDeployment", 1);
  hasResource(stack, "Custom::SSTBucketDeployment", {
    Sources: [
      {
        BucketName: ANY,
        ObjectKey: ANY,
      },
    ],
    DestinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
  });
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
  hasResource(stack, "Custom::SSTCloudFrontInvalidation", {
    DistributionPaths: ["/*"],
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      CustomErrorResponses: [
        {
          ErrorCode: 403,
          ResponseCode: 200,
          ResponsePagePath: "/index.html",
        },
        {
          ErrorCode: 404,
          ResponseCode: 200,
          ResponsePagePath: "/index.html",
        },
      ],
    }),
  });
});

test("constructor: local debug with disablePlaceholder true", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    disablePlaceholder: true,
  });
  countResources(stack, "Custom::SSTBucketDeployment", 1);
  hasResource(stack, "Custom::SSTBucketDeployment", {
    Sources: [
      {
        BucketName: ANY,
        ObjectKey: ANY,
      },
    ],
    DestinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      CustomErrorResponses: ABSENT,
    }),
  });
});

/////////////////////////////
// Test Constructor for skipBuild
/////////////////////////////

test("constructor: skipBuild", async () => {
  const app = new App({
    skipBuild: true,
  });
  const stack = new Stack(app, "stack");
  new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
  });
  countResources(stack, "Custom::SSTBucketDeployment", 1);
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new NextjsSite(stack, "Site", {
    path: "test/nextjs-site",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestBuildOutputPath" not exposed in props
    sstTestBuildOutputPath: buildOutputPath,
  });
  site.attachPermissions(["sns"]);
  countResourcesLike(stack, "AWS::IAM::Policy", 1, {
    PolicyDocument: {
      Statement: arrayWith([
        {
          Action: "sns:*",
          Effect: "Allow",
          Resource: "*",
        },
      ]),
      Version: "2012-10-17",
    },
  });
});
