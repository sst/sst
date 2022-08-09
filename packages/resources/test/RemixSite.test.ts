import { test, expect, beforeAll, vi } from "vitest";
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
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { App, Api, Stack, RemixSite } from "../src";

process.env.SST_RESOURCES_TESTS = "enabled";
const sitePath = "test/remix-site";

beforeAll(async () => {
  // ℹ️ Uncomment the below to iterate faster on tests in vitest watch mode;
  // if (fs.pathExistsSync(path.join(sitePath, "node_modules"))) {
  //   return;
  // }

  // Install Remix app dependencies
  execSync("npm install", {
    cwd: sitePath,
    stdio: "inherit",
  });
  // Build Remix app
  execSync("npm run build", {
    cwd: sitePath,
    stdio: "inherit",
  });
});

/////////////////////////////
// Test Constructor
/////////////////////////////

test("edge: undefined", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 6);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      CacheBehaviors: [
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteBuildCache0ED8AF59",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "build/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin22B8FA4E2",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteStaticsCache29AFAE7C",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "favicon.ico",
          TargetOriginId: "devmyappstackSiteDistributionOrigin22B8FA4E2",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteStaticsCache29AFAE7C",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "foo/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin22B8FA4E2",
          ViewerProtocolPolicy: "redirect-to-https",
        },
      ],
      DefaultCacheBehavior: {
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
          Ref: "SiteServerCacheC3EA2799",
        },
        CachedMethods: ["GET", "HEAD", "OPTIONS"],
        Compress: true,
        TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
        ViewerProtocolPolicy: "redirect-to-https",
      },
      DefaultRootObject: "",
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "https-only",
            OriginSSLProtocols: ["TLSv1.2"],
          },
          DomainName: {
            "Fn::Select": ANY,
          },
          Id: "devmyappstackSiteDistributionOrigin1F25265FA",
        },
        {
          DomainName: {
            "Fn::GetAtt": ["SiteS3Bucket43E5BB2F", "RegionalDomainName"],
          },
          Id: "devmyappstackSiteDistributionOrigin22B8FA4E2",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "SiteDistributionOrigin2S3OriginD0424A5E",
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
    ServiceToken: {
      "Fn::GetAtt": ["SiteS3Handler5F76C26E", "Arn"],
    },
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
        "build/*",
        "--cache-control",
        "public,max-age=31536000,immutable",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "favicon.ico",
        "--cache-control",
        "public,max-age=3600,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "foo/*",
        "--cache-control",
        "public,max-age=3600,must-revalidate",
      ],
    ],
  });
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
  hasResource(stack, "Custom::SSTCloudFrontInvalidation", {
    DistributionPaths: ["/*"],
  });
});

test("edge: undefined: environment set on server function", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    environment: {
      CONSTANT_ENV: "my-url",
      REFERENCE_ENV: api.url,
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });

  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        CONSTANT_ENV: "my-url",
        REFERENCE_ENV: ANY,
      },
    },
  });
});

test("edge: false", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    edge: false,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Origins: [
        {
          CustomOriginConfig: {
            OriginProtocolPolicy: "https-only",
            OriginSSLProtocols: ["TLSv1.2"],
          },
          DomainName: {
            "Fn::Select": ANY,
          },
          Id: "devmyappstackSiteDistributionOrigin1F25265FA",
        },
        {
          DomainName: {
            "Fn::GetAtt": ["SiteS3Bucket43E5BB2F", "RegionalDomainName"],
          },
          Id: "devmyappstackSiteDistributionOrigin22B8FA4E2",
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "SiteDistributionOrigin2S3OriginD0424A5E",
                  },
                ],
              ],
            },
          },
        },
      ],
    }),
  });
});

test("edge: true", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    edge: true,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 8);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      CacheBehaviors: [
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: {
            Ref: "SiteBuildCache0ED8AF59",
          },
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "build/*",
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
          PathPattern: "favicon.ico",
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
          PathPattern: "foo/*",
          TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
          ViewerProtocolPolicy: "redirect-to-https",
        },
      ],
      DefaultCacheBehavior: {
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
          Ref: "SiteServerCacheC3EA2799",
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
    ServiceToken: {
      "Fn::GetAtt": ["SiteS3Handler5F76C26E", "Arn"],
    },
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
        "build/*",
        "--cache-control",
        "public,max-age=31536000,immutable",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "favicon.ico",
        "--cache-control",
        "public,max-age=3600,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "foo/*",
        "--cache-control",
        "public,max-age=3600,must-revalidate",
      ],
    ],
  });
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
  hasResource(stack, "Custom::SSTCloudFrontInvalidation", {
    DistributionPaths: ["/*"],
  });
});

test("edge: true: environment generates placeholders", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    edge: true,
    environment: {
      CONSTANT_ENV: "my-url",
      REFERENCE_ENV: api.url,
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });

  countResourcesLike(stack, "Custom::SSTLambdaCodeUpdater", 1, {
    ReplaceValues: [
      {
        files: "index-wrapper.js",
        search: '"{{ _SST_EDGE_FUNCTION_ENVIRONMENT_ }}"',
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

test("constructor: with domain", async () => {
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: "domain.com",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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

  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: "domain.com",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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

  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: {
      domainName: "domain.com",
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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

  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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

  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        hostedZone: route53.HostedZone.fromLookup(stack, "HostedZone", {
          domainName: "domain.com",
        }),
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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

  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
      isExternalDomain: true,
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
    new RemixSite(stack, "Site", {
      path: "test/remix-site",
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and domainAlias set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: "test/remix-site",
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
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(
    /Domain alias is only supported for domains hosted on Amazon Route 53/
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: "test/remix-site",
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
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("constructor: path not exist", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: "does-not-exist",
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(/Could not find "remix.config.js"/);
});

test("constructor: skipbuild doesn't expect path", async () => {
  const stack = new Stack(
    new App({
      skipBuild: true,
    }),
    "stack"
  );
  expect(() => {
    new RemixSite(stack, "Site", {
      path: "does-not-exist",
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).not.toThrow(/No path found/);
});

test("cdk.bucket is props", async () => {
  const stack = new Stack(new App(), "stack");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    cdk: {
      bucket: {
        bucketName: "my-bucket",
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    BucketName: "my-bucket",
  });
});

test("cdk.bucket is construct", async () => {
  const stack = new Stack(new App(), "stack");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    cdk: {
      bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::S3::Bucket", 0);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Origins: [
        ANY,
        objectLike({
          S3OriginConfig: {
            OriginAccessIdentity: {
              "Fn::Join": [
                "",
                [
                  "origin-access-identity/cloudfront/",
                  {
                    Ref: "SiteDistributionOrigin2S3OriginD0424A5E",
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

test("constructor: cfCachePolicies props default", async () => {
  const stack = new Stack(new App(), "stack");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 3);
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST RemixSite Browser Build Default Cache Policy",
    }),
  });
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST RemixSite Public Folder Default Cache Policy",
    }),
  });
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST RemixSite Server Response Default Cache Policy",
    }),
  });
});

test("constructor: cfCachePolicies props override", async () => {
  const stack = new Stack(new App(), "stack");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    cdk: {
      cachePolicies: {
        buildCachePolicy: cf.CachePolicy.fromCachePolicyId(
          stack,
          "BuildCachePolicy",
          "BuildCachePolicyId"
        ),
        staticsCachePolicy: cf.CachePolicy.fromCachePolicyId(
          stack,
          "StaticsCachePolicy",
          "StaticsCachePolicyId"
        ),
        serverCachePolicy: cf.CachePolicy.fromCachePolicyId(
          stack,
          "ServerCachePolicy",
          "ServerCachePolicyId"
        ),
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 0);
});

test("constructor: cfDistribution props", async () => {
  const stack = new Stack(new App(), "stack");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    cdk: {
      distribution: {
        comment: "My Comment",
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    cdk: {
      distribution: {
        defaultBehavior: {
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        },
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
    new RemixSite(stack, "Site", {
      path: "test/remix-site",
      cdk: {
        distribution: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(/Do not configure the "cfDistribution.certificate"/);
});

test("constructor: cfDistribution domainNames conflict", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: "test/remix-site",
      cdk: {
        distribution: {
          domainNames: ["domain.com"],
        },
      },
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: local debug", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    disablePlaceholder: true,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
  new RemixSite(stack, "Site", {
    path: "test/remix-site",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "Custom::SSTBucketDeployment", 1);
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: "test/remix-site",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
