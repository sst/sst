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
import {
  Api,
  Stack,
  StaticSite,
  StaticSiteProps,
} from "../../dist/constructs/";

beforeEach(async () => {
  await clearBuildOutput();
});

afterAll(async () => {
  await clearBuildOutput();
});

async function createSite(
  props?: StaticSiteProps | ((stack: Stack) => StaticSiteProps)
) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, site };
}

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

test("customDomain: no domain", async () => {
  const { stack, site } = await createSite();
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
  countResources(stack, "Custom::S3Uploader", 1);
  hasResource(stack, "Custom::S3Uploader", {
    sources: [
      {
        bucketName: ANY,
        objectKey: ANY,
      },
    ],
    destinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
    fileOptions: [
      {
        files: "**",
        cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
      },
      {
        files: ["**/*.js", "**/*.css"],
        cacheControl: "max-age=31536000,public,immutable",
      },
    ],
    replaceValues: [],
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});

test("customDomain: string", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { stack, site } = await createSite({
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

test("customDomain: props", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { stack, site } = await createSite({
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

test("customDomain: props with domainAlias", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { stack, site } = await createSite({
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

test("customDomain: props with hostedZone string", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { stack, site } = await createSite({
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

test("customDomain: props with hostedZone construct", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { stack, site } = await createSite((stack) => ({
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        hostedZone: route53.HostedZone.fromLookup(stack, "HostedZone", {
          domainName: "domain.com",
        }),
      },
    },
  }));
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

test("customDomain: props with certificate imported", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { stack, site } = await createSite((stack) => ({
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
    },
  }));
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

test("customDomain: props with isExternalDomain true", async () => {
  const { stack, site } = await createSite((stack) => ({
    customDomain: {
      domainName: "www.domain.com",
      cdk: {
        certificate: new acm.Certificate(stack, "Cert", {
          domainName: "domain.com",
        }),
      },
      isExternalDomain: true,
    },
  }));
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
  expect(async () => {
    await createSite({
      customDomain: {
        domainName: "www.domain.com",
        isExternalDomain: true,
      },
    });
  }).rejects.toThrow(
    /A valid certificate is required when "isExternalDomain" is set to "true"./
  );
});

test("customDomain: isExternalDomain true and domainAlias set", async () => {
  expect(async () => {
    await createSite((stack) => ({
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
    }));
  }).rejects.toThrow(
    /Domain alias is only supported for domains hosted on Amazon Route 53/
  );
});

test("customDomain: isExternalDomain true and hostedZone set", async () => {
  expect(async () => {
    await createSite((stack) => ({
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
    }));
  }).rejects.toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("constructor: path not exist", async () => {
  expect(async () => {
    await createSite({
      path: "does-not-exist",
    });
  }).rejects.toThrow(/No path found/);
});

test("constructor: path with space", async () => {
  expect(async () => {
    await createSite({
      path: "test/constructs/site with space in path",
    });
  }).rejects.not.toThrow(/No path found/);
});

test("constructor: errorPage is string", async () => {
  const { stack } = await createSite({
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
  const { stack } = await createSite({
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
  await createSite((stack) => {
    const api = new Api(stack, "Api");
    return {
      path: "test/constructs/vite-static-site",
      buildCommand: "npm run build",
      environment: {
        VITE_CONSTANT_ENV: "my-url",
        VITE_REFERENCE_ENV: api.url,
      },
    };
  });
  const indexHtml = await fs.readFile(
    "test/constructs/vite-static-site/dist/index.html"
  );
  expect(indexHtml.toString().trim()).toBe("my-url {{ VITE_REFERENCE_ENV }}");
});

test("constructor: buildCommand error", async () => {
  expect(async () => {
    await createSite({
      buildCommand: "garbage command",
    });
  }).rejects.toThrow(/There was a problem building the "Site" StaticSite./);
});

test("constructor: buildOutput multiple files", async () => {
  const { stack, site } = await createSite({
    buildOutput: "build-with-30b-data",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: "sstTestFileSizeLimitOverride" not exposed in props
    sstTestFileSizeLimitOverride: 0.000025,
  });
  hasResource(stack, "Custom::S3Uploader", {
    sources: [
      {
        bucketName: ANY,
        objectKey: ANY,
      },
      {
        bucketName: ANY,
        objectKey: ANY,
      },
    ],
  });
});
test("constructor: buildOutput not exist", async () => {
  expect(async () => {
    await createSite({
      buildOutput: "does-not-exist",
    });
  }).rejects.toThrow(/No build output found/);
});

test("assets.fileOptions", async () => {
  const { stack, site } = await createSite({
    assets: {
      fileOptions: [
        {
          files: "**/*.zip",
          contentType: "application/zip",
        },
      ],
    },
  });
  hasResource(stack, "Custom::S3Uploader", {
    fileOptions: [
      {
        files: "**",
        cacheControl: "max-age=0,no-cache,no-store,must-revalidate",
      },
      {
        files: ["**/*.js", "**/*.css"],
        cacheControl: "max-age=31536000,public,immutable",
      },
      {
        files: "**/*.zip",
        contentType: "application/zip",
      },
    ],
  });
});
test("fileOptions (deprecated): defined", async () => {
  expect(async () => {
    await createSite({
      // @ts-expect-error
      fileOptions: [
        {
          exclude: "*",
          include: "*.zip",
          contentType: "application/zip",
        },
      ],
    });
  }).rejects.toThrow(/property has been replaced/);
});

test("constructor: replaceValues", async () => {
  const { stack, site } = await createSite({
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
  hasResource(stack, "Custom::S3Uploader", {
    sources: [
      {
        bucketName: ANY,
        objectKey: ANY,
      },
    ],
    destinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
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
});

test("vite.types: undefined: is vite site", async () => {
  const { stack, site } = await createSite({
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
  await createSite({
    customDomain: "domain.com",
  });
  expect(
    await fs
      .access("test/constructs/vite-static-site/src/sst-env.d.ts")
      .then(() => true)
      .catch(() => false)
  ).toBeFalsy();
});

test("vite.types: defined", async () => {
  const { stack, site } = await createSite({
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
  const { stack, site } = await createSite({
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
  expect(async () => {
    await createSite({
      cdk: {
        bucket: {
          websiteIndexDocument: "index.html",
        },
      },
    });
  }).rejects.toThrow(/Do not configure the "s3Bucket.websiteIndexDocument"./);
});

test("cdk.bucket is props: s3Bucket websiteErrorDocument", async () => {
  expect(async () => {
    await createSite({
      cdk: {
        bucket: {
          websiteErrorDocument: "error.html",
        },
      },
    });
  }).rejects.toThrow(/Do not configure the "s3Bucket.websiteErrorDocument"./);
});

test("cdk.bucket is construct", async () => {
  const { stack, site } = await createSite((stack) => ({
    cdk: {
      bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
    },
  }));
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
  hasResource(stack, "Custom::S3Uploader", {
    destinationBucketName: "my-bucket",
  });
});

test("cdk.distribution is props", async () => {
  const { stack } = await createSite({
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

test("cdk.distribution is construct", async () => {
  const { stack, site } = await createSite((stack) => ({
    customDomain: "domain.com",
    cdk: {
      distribution: cf.Distribution.fromDistributionAttributes(
        stack,
        "IDistribution",
        {
          distributionId: "frontend-distribution-id",
          domainName: "domain.com",
        }
      ),
    },
  }));
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});

test("cdk.distribution props override errorResponses", async () => {
  const { stack, site } = await createSite({
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

test("cdk.distribution defaultBehavior override", async () => {
  const { stack, site } = await createSite({
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

test("cdk.distribution certificate conflict", async () => {
  expect(async () => {
    await createSite((stack) => ({
      cdk: {
        distribution: {
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
    }));
  }).rejects.toThrow(/Do not configure the "cfDistribution.certificate"/);
});

test("cdk.distribution domainNames conflict", async () => {
  expect(async () => {
    await createSite({
      cdk: {
        distribution: {
          domainNames: ["domain.com"],
        },
      },
    });
  }).rejects.toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

test("constructor: environment generates placeholders", async () => {
  const { stack, site } = await createSite((stack) => {
    const api = new Api(stack, "Api");
    return {
      environment: {
        CONSTANT_ENV: "constant",
        REFERENCE_ENV: api.url,
      },
    };
  });
  hasResource(stack, "Custom::S3Uploader", {
    replaceValues: [
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
  const { stack, site } = await createSite((stack) => {
    const api = new Api(stack, "Api");
    return {
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
    };
  });
  hasResource(stack, "Custom::S3Uploader", {
    replaceValues: [
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
  await app.finish();
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::S3Uploader", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("constructor: sst dev: dev.url undefined", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/constructs/site",
  });
  await app.finish();
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::S3Uploader", 0);
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
  await app.finish();
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
  await app.finish();
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::S3Uploader", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});
