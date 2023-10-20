import * as fs from "fs";
import * as path from "path";
import { test, expect, beforeAll, vi } from "vitest";
import { execSync } from "child_process";
import {
  getResources,
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
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Api, Stack, RemixSite } from "../../dist/constructs/";
import { SsrSiteProps } from "../../dist/constructs/SsrSite";
import { CacheControl } from "aws-cdk-lib/aws-codepipeline-actions/index.js";

const sitePath = "test/constructs/remix-site";

beforeAll(async () => {
  // Set `SKIP_BUILD` to iterate faster on tests in vitest watch mode;
  if (
    process.env.SKIP_BUILD &&
    fs.existsSync(path.join(sitePath, "node_modules"))
  ) {
    return;
  }

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

async function createSite(
  props?: SsrSiteProps | ((stack: Stack) => SsrSiteProps)
) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, site };
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("default", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk!.function?.role?.roleArn).toBeDefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 3);
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
  countResources(stack, "Custom::S3Uploader", 1);
  hasResource(stack, "Custom::S3Uploader", {
    ServiceToken: {
      "Fn::GetAtt": ["CustomResourceHandlerE8FB56BA", "Arn"],
    },
    sources: [
      {
        bucketName: ANY,
        objectKey: ANY,
      },
    ],
    destinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
  });
});
test("default: check CloudFront functions configured correctly", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        FunctionAssociations: ANY,
      }),
      CacheBehaviors: [
        objectLike({
          PathPattern: "build/*",
          FunctionAssociations: ANY,
        }),
        objectLike({
          PathPattern: "favicon.ico",
          FunctionAssociations: ANY,
        }),
        objectLike({
          PathPattern: "foo/*",
          FunctionAssociations: ANY,
        }),
      ],
    }),
  });
  // Ensure that the server function is not the same as the static function
  const r = getResources(stack, "AWS::CloudFront::Distribution")
    .SiteDistribution390DED28.Properties.DistributionConfig;
  const serverCfFunctionArn =
    r.DefaultCacheBehavior.FunctionAssociations[0].FunctionARN;
  const staticCfFunctionArns = [
    r.CacheBehaviors[0].FunctionAssociations[0].FunctionARN,
    r.CacheBehaviors[1].FunctionAssociations[0].FunctionARN,
    r.CacheBehaviors[2].FunctionAssociations[0].FunctionARN,
  ];
  expect(serverCfFunctionArn).not.toEqual(staticCfFunctionArns[0]);
  expect(staticCfFunctionArns[0]).toEqual(staticCfFunctionArns[1]);
  expect(staticCfFunctionArns[0]).toEqual(staticCfFunctionArns[2]);
});

test("path not exist", async () => {
  expect(async () => {
    await createSite({
      path: "does-not-exist",
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
    });
  }).rejects.toThrow(/No site found/);
});

test("edge: undefined: environment set on server function", async () => {
  const { site, stack } = await createSite((stack) => {
    const api = new Api(stack, "Api");
    return {
      environment: {
        CONSTANT_ENV: "my-url",
        REFERENCE_ENV: api.url,
      },
      sstTest: true,
    };
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
  const { site, stack } = await createSite({
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
  const { site, stack } = await createSite({
    edge: true,
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk!.function?.role?.roleArn).toBeDefined();
  expect(site.cdk!.bucket.bucketArn).toBeDefined();
  expect(site.cdk!.bucket.bucketName).toBeDefined();
  expect(site.cdk!.distribution.distributionId).toBeDefined();
  expect(site.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(site.cdk!.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::Lambda::Function", 4);
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
  countResources(stack, "Custom::S3Uploader", 1);
  hasResource(stack, "Custom::S3Uploader", {
    ServiceToken: {
      "Fn::GetAtt": ["CustomResourceHandlerE8FB56BA", "Arn"],
    },
    sources: [
      {
        bucketName: ANY,
        objectKey: ANY,
      },
    ],
    destinationBucketName: {
      Ref: "SiteS3Bucket43E5BB2F",
    },
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});
test("edge: true: environment generates placeholders", async () => {
  const { site, stack } = await createSite((stack) => {
    const api = new Api(stack, "Api");
    return {
      edge: true,
      environment: {
        CONSTANT_ENV: "my-url",
        REFERENCE_ENV: api.url,
      },
      sstTest: true,
    };
  });
  countResourcesLike(stack, "Custom::AssetReplacer", 1, {
    replacements: [
      {
        files: "/server.mjs",
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

test("customDomain: string", async () => {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const { site, stack } = await createSite({
    customDomain: "domain.com",
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  expect(site.customDomainUrl).toEqual("https://domain.com");
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Aliases: ["domain.com"],
    }),
  });
});

test("timeout undefined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      Origins: arrayWith([
        objectLike({
          CustomOriginConfig: objectLike({
            OriginReadTimeout: 10,
          }),
        }),
      ]),
    }),
  });
});
test("timeout defined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
test("timeout too alrge for regional", async () => {
  expect(async () => {
    await createSite({
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
      timeout: 1000,
    });
  }).rejects.toThrow(/timeout must be less than or equal to 180 seconds/);
});
test("timeout too alrge for edge", async () => {
  expect(async () => {
    await createSite({
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
      edge: true,
      timeout: 1000,
    });
  }).rejects.toThrow(/timeout must be less than or equal to 30 seconds/);
});

test("assets.fileOptions: undefined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  hasResource(stack, "Custom::S3Uploader", {
    ServiceToken: {
      "Fn::GetAtt": ["CustomResourceHandlerE8FB56BA", "Arn"],
    },
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
        files: "build/**",
        cacheControl: "public,max-age=31536000,immutable",
      },
      {
        files: "**",
        ignore: "build/**",
        cacheControl:
          "public,max-age=0,s-maxage=86400,stale-while-revalidate=8640",
      },
    ],
  });
});
test("assets.fileOptions: defined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
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
      { files: "**/*.zip", contentType: "application/zip" },
      {
        files: "build/**",
        cacheControl: "public,max-age=31536000,immutable",
      },
      {
        files: "**",
        ignore: "build/**",
        cacheControl:
          "public,max-age=0,s-maxage=86400,stale-while-revalidate=8640",
      },
    ],
  });
});
test("fileOptions (deprecated): defined", async () => {
  expect(async () => {
    await createSite({
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
      fileOptions: [
        {
          exclude: "*",
          include: "build/*",
          cacheControl: "public,max-age=31536000,immutable",
          contentType: "text/html; charset=utf-8",
        },
      ],
    });
  }).rejects.toThrow(/property has been replaced/);
});
test("assets.cdnInvalidationStrategy: undefined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});
test("assets.cdnInvalidationStrategy: never", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
    assets: {
      cdnInvalidationStrategy: "never",
    },
  });
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("warm: undefined", async () => {
  const { stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 0, {
    Environment: {
      Variables: {
        FUNCTION_NAME: ANY,
        CONCURRENCY: ANY,
      },
    },
  });
});
test("warm: defined", async () => {
  const { stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
    warm: 2,
  });
  countResourcesLike(stack, "AWS::Lambda::Function", 1, {
    Environment: {
      Variables: {
        FUNCTION_NAME: ANY,
        CONCURRENCY: ANY,
      },
    },
  });
  hasResource(stack, "AWS::Lambda::Function", {
    Environment: {
      Variables: {
        FUNCTION_NAME: { Ref: "SiteServerFunction70E7C026" },
        CONCURRENCY: "2",
      },
    },
  });
});
test("warm: edge", async () => {
  expect(async () => {
    await createSite({
      // @ts-expect-error: "sstTest" is not exposed in props
      sstTest: true,
      warm: 2,
      edge: true,
    });
  }).rejects.toThrow(/warming is currently supported/);
});

test("regional.enableServerUrlIamAuth: undefined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "Custom::SSTEdgeLambda", 0);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        LambdaFunctionAssociations: [],
      }),
    }),
  });
});
test("regional.enableServerUrlIamAuth: true", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
    regional: {
      enableServerUrlIamAuth: true,
    },
  });
  countResources(stack, "Custom::SSTEdgeLambda", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      DefaultCacheBehavior: objectLike({
        LambdaFunctionAssociations: [
          {
            EventType: "origin-request",
            IncludeBody: true,
            LambdaFunctionARN: ANY,
          },
        ],
      }),
    }),
  });
});

test("cdk.serverCachePolicy undefined", async () => {
  const { site, stack } = await createSite({
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
test("cdk.serverCachePolicy override", async () => {
  const { site, stack } = await createSite((stack) => ({
    cdk: {
      serverCachePolicy: CachePolicy.fromCachePolicyId(
        stack,
        "ServerCachePolicy",
        "ServerCachePolicyId"
      ),
    },
    sstTest: true,
  }));
  countResources(stack, "AWS::CloudFront::CachePolicy", 0);
});

test("cdk.responseHeadersPolicy undefined", async () => {
  const { site, stack } = await createSite({
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  countResources(stack, "AWS::CloudFront::ResponseHeadersPolicy", 0);
});
test("cdk.responseHeadersPolicy override", async () => {
  const { site, stack } = await createSite((stack) => ({
    cdk: {
      responseHeadersPolicy: new ResponseHeadersPolicy(stack, "Policy", {
        removeHeaders: ["Server"],
      }),
    },
    sstTest: true,
  }));
  countResources(stack, "AWS::CloudFront::CachePolicy", 1);
});

test("cdk.distribution props", async () => {
  const { site, stack } = await createSite({
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
test("cdk.distribution defaultBehavior override", async () => {
  const { site, stack } = await createSite({
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

test("cdk.bucket is props", async () => {
  const { site, stack } = await createSite({
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
  const { site, stack } = await createSite((stack) => ({
    cdk: {
      bucket: s3.Bucket.fromBucketName(stack, "Bucket", "my-bucket"),
    },
    sstTest: true,
  }));
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
  hasResource(stack, "Custom::S3Uploader", {
    destinationBucketName: "my-bucket",
  });
});

test("cdk.distribution.defaultBehavior no functionAssociations", async () => {
  const { site, stack } = await createSite();
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
test("cdk.distribution.defaultBehavior additional functionAssociations", async () => {
  const { site, stack } = await createSite((stack) => ({
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
  }));
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

test("cdk.server.logRetention", async () => {
  const { site, stack } = await createSite({
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

test("sst deploy inactive stack", async () => {
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
  await app.finish();
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::S3Uploader", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("sst dev: dev.url undefined", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
  });
  await app.finish();
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::S3Uploader", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});
test("sst dev: dev.url string", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    dev: {
      url: "localhost:3000",
    },
  });
  await app.finish();
  expect(site.url).toBe("localhost:3000");
});
test("sst dev: disablePlaceholder true", async () => {
  const app = await createApp({ mode: "dev" });
  const stack = new Stack(app, "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
    dev: {
      deploy: true,
    },
    // @ts-expect-error: "sstTest" is not exposed in props
    sstTest: true,
  });
  await app.finish();
  expect(site.url).toBeDefined();
  countResources(stack, "AWS::CloudFront::Distribution", 1);
});

test("sst remove", async () => {
  const app = await createApp({ mode: "remove" });
  const stack = new Stack(app, "stack");
  const site = new RemixSite(stack, "Site", {
    path: sitePath,
  });
  await app.finish();
  expect(site.url).toBeUndefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.cdk).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 0);
  countResources(stack, "Custom::S3Uploader", 0);
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

/////////////////////////////
// Test Methods
/////////////////////////////

test("attachPermissions", async () => {
  const { site, stack } = await createSite({
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
