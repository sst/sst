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
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import { Api, Stack, StaticSite } from "../../dist/constructs/";

process.env.SST_RESOURCES_TESTS = "enabled";

beforeEach(async () => {
  await clearBuildOutput();
});

afterAll(async () => {
  await clearBuildOutput();
});

async function clearBuildOutput() {
  await fs.rm("test/constructs/vite-static-site/dist", {
    recursive: true,
    force: true,
  });
  await fs.rm("test/constructs/vite-static-site/src/sst-env.d.ts", {
    recursive: true,
    force: true,
  });
  await fs.rm("test/constructs/vite-static-site/src/my-env.d.ts", {
    recursive: true,
    force: true,
  });
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("base: no domain", async () => {
  const stack = new Stack(await createApp(), "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
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
      DefaultCacheBehavior: {
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        TargetOriginId: "testappstackSiteDistributionOrigin1DD2DF794",
        ViewerProtocolPolicy: "redirect-to-https",
      },
      DefaultRootObject: "index.html",
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
        "*.html",
        "--cache-control",
        "max-age=0,no-cache,no-store,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "*.js",
        "--include",
        "*.css",
        "--cache-control",
        "max-age=31536000,public,immutable",
      ],
    ],
    ReplaceValues: [],
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});

test("base: with domain", async () => {
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: "domain.com",
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

test("base: with domain with alias", async () => {
  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: "domain.com",
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

  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: {
      domainName: "domain.com",
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        hostedZone: route53.HostedZone.fromLookup(stack, "HostedZone", {
          domainName: "domain.com",
        }),
      },
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
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
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
      isExternalDomain: true,
    },
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
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
    });
  }).toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and domainAlias set", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
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
    });
  }).toThrow(
    /Domain alias is only supported for domains hosted on Amazon Route 53/
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
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
    });
  }).toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("constructor: path not exist", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "does-not-exist",
    });
  }).toThrow(/No path found/);
});

test("constructor: errorPage is string", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    errorPage: "error.html",
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      CustomErrorResponses: [
        {
          ErrorCode: 403,
          ResponseCode: 403,
          ResponsePagePath: "/error.html",
        },
        {
          ErrorCode: 404,
          ResponseCode: 404,
          ResponsePagePath: "/error.html",
        },
      ],
    }),
  });
});

test("constructor: errorPage is enum", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    errorPage: "redirect_to_index_page",
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

test("constructor: buildCommand defined", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new Api(stack, "Api");
  new StaticSite(stack, "Site", {
    path: "test/constructs/vite-static-site",
    buildCommand: "npm run build",
    environment: {
      VITE_CONSTANT_ENV: "my-url",
      VITE_REFERENCE_ENV: api.url,
    },
  });
  const indexHtml = await fs.readFile(
    "test/constructs/vite-static-site/dist/index.html"
  );
  expect(indexHtml.toString().trim()).toBe("my-url {{ VITE_REFERENCE_ENV }}");
});

test("constructor: buildCommand error", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      buildCommand: "garbage command",
    });
  }).toThrow(/There was a problem building the "Site" StaticSite./);
});

test("constructor: buildOutput multiple files", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    buildOutput: "build-with-30b-data",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
    sstTestFileSizeLimitOverride: 0.000025,
  });
  hasResource(stack, "Custom::SSTBucketDeployment", {
    Sources: [
      {
        BucketName: ANY,
        ObjectKey: ANY,
      },
      {
        BucketName: ANY,
        ObjectKey: ANY,
      },
    ],
  });
});

test("constructor: buildOutput not exist", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      buildOutput: "does-not-exist",
    });
  }).toThrow(/No build output found/);
});

test("constructor: fileOptions", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    fileOptions: [
      {
        exclude: "*",
        include: "*.html",
        cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
      },
      {
        exclude: "*",
        include: "*.js",
        cacheControl: "max-age=31536000,public,immutable",
      },
    ],
  });
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
        "*.html",
        "--cache-control",
        "max-age=0,no-cache,no-store,must-revalidate",
      ],
      [
        "--exclude",
        "*",
        "--include",
        "*.js",
        "--cache-control",
        "max-age=31536000,public,immutable",
      ],
    ],
    ReplaceValues: [],
  });
});

test("constructor: fileOptions array value", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    fileOptions: [
      {
        exclude: "*",
        include: ["*.js", "*.css"],
        cacheControl: "max-age=31536000,public,immutable",
      },
    ],
  });
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
        "*.js",
        "--include",
        "*.css",
        "--cache-control",
        "max-age=31536000,public,immutable",
      ],
    ],
    ReplaceValues: [],
  });
});

test("constructor: replaceValues", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    replaceValues: [
      {
        files: "*.js",
        search: "{{ API_URL }}",
        replace: "a",
      },
      {
        files: "*.html",
        search: "{{ COGNITO_ID }}",
        replace: "b",
      },
    ],
  });
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
    ReplaceValues: [
      {
        files: "*.js",
        search: "{{ API_URL }}",
        replace: "a",
      },
      {
        files: "*.html",
        search: "{{ COGNITO_ID }}",
        replace: "b",
      },
    ],
  });
});

test("vite.types: undefined: is vite site", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/vite-static-site",
  });
  expect(
    await fs
      .access("test/constructs/vite-static-site/src/sst-env.d.ts")
      .then(() => true)
      .catch(() => false)
  ).toBeTruthy();
});

test("vite.types: undefined: not vite site", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(
    await fs
      .access("test/constructs/vite-static-site/src/sst-env.d.ts")
      .then(() => true)
      .catch(() => false)
  ).toBeFalsy();
});

test("vite.types: defined", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/vite-static-site",
    vite: {
      types: "src/my-env.d.ts",
    },
  });
  expect(
    await fs
      .access("test/constructs/vite-static-site/src/sst-env.d.ts")
      .then(() => true)
      .catch(() => false)
  ).toBeFalsy();
  expect(
    await fs
      .access("test/constructs/vite-static-site/src/my-env.d.ts")
      .then(() => true)
      .catch(() => false)
  ).toBeTruthy();
});

test("cdk.bucket is props", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    cdk: {
      bucket: {
        bucketName: "my-bucket",
      },
    },
  });
  countResources(stack, "AWS::S3::Bucket", 1);
  hasResource(stack, "AWS::S3::Bucket", {
    BucketName: "my-bucket",
  });
});

test("cdk.bucket is props: s3Bucket websiteIndexDocument", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      cdk: {
        bucket: {
          websiteIndexDocument: "index.html",
        },
      },
    });
  }).toThrow(/Do not configure the "s3Bucket.websiteIndexDocument"./);
});

test("cdk.bucket is props: s3Bucket websiteErrorDocument", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      cdk: {
        bucket: {
          websiteErrorDocument: "error.html",
        },
      },
    });
  }).toThrow(/Do not configure the "s3Bucket.websiteErrorDocument"./);
});

test("cdk.bucket is construct", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    cdk: {
      bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
    },
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

test("constructor: cfDistribution props", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    cdk: {
      distribution: {
        comment: "My Comment",
      },
    },
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Comment: "My Comment",
    }),
  });
});

test("constructor: cfDistribution is construct", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: "domain.com",
    cdk: {
      distribution: cloudfront.Distribution.fromDistributionAttributes(
        stack,
        "IDistribution",
        {
          distributionId: "frontend-distribution-id",
          domainName: "domain.com",
        }
      ),
    },
  });
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
  countResources(stack, "AWS::Route53::HostedZone", 1);
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("constructor: cfDistribution props override errorResponses", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    cdk: {
      distribution: {
        errorResponses: [
          {
            httpStatus: 403,
            responsePagePath: `/new.html`,
            responseHttpStatus: 200,
          },
        ],
      },
    },
  });
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      CustomErrorResponses: [
        {
          ErrorCode: 403,
          ResponseCode: 200,
          ResponsePagePath: "/new.html",
        },
      ],
    }),
  });
});

test("constructor: cfDistribution props override errorResponses error", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      errorPage: "error.html",
      cdk: {
        distribution: {
          errorResponses: [
            {
              httpStatus: 403,
              responsePagePath: `/new.html`,
              responseHttpStatus: 200,
            },
          ],
        },
      },
    });
  }).toThrow(
    /Cannot configure the "cfDistribution.errorResponses" when "errorPage" is passed in./
  );
});

test("constructor: cfDistribution defaultBehavior override", async () => {
  const stack = new Stack(await createApp(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    cdk: {
      distribution: {
        defaultBehavior: {
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        },
      },
    },
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
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      cdk: {
        distribution: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
    });
  }).toThrow(/Do not configure the "cfDistribution.certificate"/);
});

test("constructor: cfDistribution domainNames conflict", async () => {
  const stack = new Stack(await createApp(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/constructs/site",
      cdk: {
        distribution: {
          domainNames: ["domain.com"],
        },
      },
    });
  }).toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

test("constructor: environment generates placeholders", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new Api(stack, "Api");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    environment: {
      CONSTANT_ENV: "constant",
      REFERENCE_ENV: api.url,
    },
  });
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
    ],
  });
});

test("constructor: environment appends to replaceValues", async () => {
  const stack = new Stack(await createApp(), "stack");
  const api = new Api(stack, "Api");
  new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    environment: {
      CONSTANT_ENV: "constant",
      REFERENCE_ENV: api.url,
    },
    replaceValues: [
      {
        files: "*.txt",
        search: "{{ KEY }}",
        replace: "value",
      },
    ],
  });
  hasResource(stack, "Custom::SSTBucketDeployment", {
    ReplaceValues: [
      {
        files: "*.txt",
        search: "{{ KEY }}",
        replace: "value",
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
    ],
  });
});

test("constructor: sst deploy inactive stack", async () => {
  const app = await createApp({
    mode: "deploy",
    isActiveStack(stackName) {
      return false;
    },
  });
  const stack = new Stack(app, "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst dev: dev.url undefined", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst dev: dev.url string", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    dev: {
      url: "localhost:3000",
    },
  });
  expect(site.url).toBe("localhost:3000");
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
});

test("constructor: sst remove", async () => {
  const app = await createApp({ mode: "remove" });
  const stack = new Stack(app, "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
  });
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::SSTBucketDeployment", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

/////////////////////////////
// Test extending ()
/////////////////////////////

test("constructor: extending createRoute53Records", async () => {
  let dummy: string;

  class MyStaticSite extends StaticSite {
    protected createRoute53Records(): void {
      dummy = "dummy";
    }
  }

  const stack = new Stack(await createApp(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new MyStaticSite(stack, "Site", {
    path: "test/constructs/site",
    customDomain: "domain.com",
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(dummy!).toMatch("dummy");
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  countResources(stack, "AWS::Route53::RecordSet", 0);
  countResources(stack, "AWS::Route53::HostedZone", 1);
});
