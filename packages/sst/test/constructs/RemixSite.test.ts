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
import * as s3 from "aws-cdk-lib/aws-s3";
import {
  Function as CfFunction,
  FunctionCode as CfFunctionCode,
  FunctionEventType,
  CachePolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
  AllowedMethods,
} from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Api, Stack, RemixSite } from "../../dist/constructs/";

process.env.SST_RESOURCES_TESTS = "enabled";
const sitePath = "test/constructs/remix-site";

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
  const stack = new Stack(await createApp(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 5);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      CacheBehaviors: [
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "build/*",
          TargetOriginId: "testappstackSiteDistributionOrigin207C27B19",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "favicon.ico",
          TargetOriginId: "testappstackSiteDistributionOrigin207C27B19",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "foo/*",
          TargetOriginId: "testappstackSiteDistributionOrigin207C27B19",
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
        TargetOriginId: "testappstackSiteDistributionOrigin1DD2DF794",
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
          Id: "testappstackSiteDistributionOrigin1DD2DF794",
        },
        {
          DomainName: {
            "Fn::GetAtt": ["SiteS3Bucket43E5BB2F", "RegionalDomainName"],
          },
          Id: "testappstackSiteDistributionOrigin207C27B19",
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
        "public,max-age=0,s-maxage=31536000,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "foo/*",
        "--cache-control",
        "public,max-age=0,s-maxage=31536000,must-revalidate",
      ],
    ],
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});

test("edge: undefined: environment set on server function", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new Api(stack, "Api");
  new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
          Id: "testappstackSiteDistributionOrigin1DD2DF794",
        },
        {
          DomainName: {
            "Fn::GetAtt": ["SiteS3Bucket43E5BB2F", "RegionalDomainName"],
          },
          Id: "testappstackSiteDistributionOrigin207C27B19",
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
  const stack = new Stack(await createApp(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    edge: true,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 6);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      CacheBehaviors: [
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "build/*",
          TargetOriginId: "testappstackSiteDistributionOrigin1DD2DF794",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "favicon.ico",
          TargetOriginId: "testappstackSiteDistributionOrigin1DD2DF794",
          ViewerProtocolPolicy: "redirect-to-https",
        },
        {
          AllowedMethods: ["GET", "HEAD", "OPTIONS"],
          CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          CachedMethods: ["GET", "HEAD", "OPTIONS"],
          Compress: true,
          PathPattern: "foo/*",
          TargetOriginId: "testappstackSiteDistributionOrigin1DD2DF794",
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
        TargetOriginId: "testappstackSiteDistributionOrigin1DD2DF794",
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
          Id: "testappstackSiteDistributionOrigin1DD2DF794",
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
        "public,max-age=0,s-maxage=31536000,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "foo/*",
        "--cache-control",
        "public,max-age=0,s-maxage=31536000,must-revalidate",
      ],
    ],
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});

test("edge: true: environment generates placeholders", async () => {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const api = new Api(stack, "Api");
  new RemixSite(stack, "Site", {
    path: sitePath,
    edge: true,
    environment: {
      CONSTANT_ENV: "my-url",
      REFERENCE_ENV: api.url,
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  await app.finish();

  printResource(stack, "Custom::AssetReplacer");
  countResourcesLike(stack, "Custom::AssetReplacer", 1, {
    replacements: [
      {
        files: "/server.cjs",
        search: '"{{ _SST_FUNCTION_ENVIRONMENT_ }}"',
        replace: {
          "Fn::Join": [
            "",
            [
              '{"CONSTANT_ENV":"my-url","REFERENCE_ENV":"',
              {
                "Fn::GetAtt": ["ApiCD79AAA0", "ApiEndpoint"],
              },
              '","SST_APP":"app","SST_STAGE":"test","SST_REGION":"us-east-1","SST_SSM_PREFIX":"/test/test/"}',
            ],
          ],
        },
      },
      {
        files: "**/*.@(*js|json|html)",
        search: "{{ CONSTANT_ENV }}",
        replace: "my-url",
      },
      {
        files: "**/*.@(*js|json|html)",
        search: "{{ REFERENCE_ENV }}",
        replace: {
          "Fn::GetAtt": ["ApiCD79AAA0", "ApiEndpoint"],
        },
      },
    ],
  });
});

test("constructor: with domain", async () => {
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    customDomain: "domain.com",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeDefined();
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
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeDefined();
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
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: "does-not-exist",
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).toThrow(/Could not find/);
});

test("constructor: cdk.serverCachePolicy undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 1);
  hasResource(stack, "AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: objectLike({
      Comment: "SST server response cache policy",
    }),
  });
});

test("constructor: cdk.serverCachePolicy override", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    cdk: {
      serverCachePolicy: CachePolicy.fromCachePolicyId(
        stack,
        "ServerCachePolicy",
        "ServerCachePolicyId"
      ),
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 0);
});

test("constructor: cdk.responseHeadersPolicy undefined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::ResponseHeadersPolicy", 0);
});

test("constructor: cdk.responseHeadersPolicy override", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    cdk: {
      responseHeadersPolicy: new ResponseHeadersPolicy(stack, "Policy", {
        removeHeaders: ["Server"],
      }),
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::CachePolicy", 1);
});

test("constructor: cfDistribution props", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    cdk: {
      distribution: {
        defaultBehavior: {
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: AllowedMethods.ALLOW_ALL,
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
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: sitePath,
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
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new RemixSite(stack, "Site", {
      path: sitePath,
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

test("constructor: cdk.bucket is props", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
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

test("constructor: cdk.bucket is construct", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
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

test("constructor: cdk.distribution.defaultBehavior no functionAssociations", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
  });
  printResource(stack, "AWS::CloudFront::Distribution");
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        FunctionAssociations: [
          {
            EventType: "viewer-request",
            FunctionARN: ANY,
          },
        ],
      }),
    }),
  });
});
test("constructor: cdk.distribution.defaultBehavior additional functionAssociations", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    cdk: {
      distribution: {
        defaultBehavior: {
          functionAssociations: [
            {
              function: new CfFunction(stack, "CloudFrontFunction", {
                code: CfFunctionCode.fromInline(`function handler(event) {}`),
              }),
              eventType: FunctionEventType.VIEWER_RESPONSE,
            },
          ],
        },
      },
    },
  });
  printResource(stack, "AWS::CloudFront::Distribution");
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        FunctionAssociations: [
          {
            EventType: "viewer-request",
            FunctionARN: ANY,
          },
          {
            EventType: "viewer-response",
            FunctionARN: ANY,
          },
        ],
      }),
    }),
  });
});

test("constructor: cdk.server.logRetention", async () => {
  const stack = new Stack(await createApp(), "stack");
  new RemixSite(stack, "Site", {
    path: sitePath,
    cdk: {
      server: {
        logRetention: RetentionDays.ONE_MONTH,
      },
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  hasResource(stack, "Custom::LogRetention", {
    RetentionInDays: 30,
  });
});

test("constructor: sst remove", async () => {
  const stack = new Stack(await createApp({ mode: "remove" }), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
  countResources(stack, "AWS::CloudFront::Distribution", 0);
});

test("constructor: sst deploy inactive stack", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return false;
    },
  });
  const stack = new Stack(app, "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst dev: dev.url undefined", async () => {
  const stack = new Stack(await createApp({ mode: "dev" }), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst dev: dev.url string", async () => {
  const stack = new Stack(await createApp({ mode: "dev" }), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    dev: {
      url: "localhost:3000",
    },
  });
  expect(site.url).toBe("localhost:3000");
});

test("constructor: sst dev: disablePlaceholder true", async () => {
  const stack = new Stack(await createApp({ mode: "dev" }), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    dev: {
      deploy: true,
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  countResources(stack, "AWS::CloudFront::Distribution", 1);
});

test("constructor: sst remove", async () => {
  const stack = new Stack(await createApp({ mode: "remove" }), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const stack = new Stack(await createApp(), "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
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
