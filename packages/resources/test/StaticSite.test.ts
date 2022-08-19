import { test, expect, vi } from "vitest";
import { countResources, hasResource, objectLike, ANY, ABSENT } from "./helper";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import { App, Api, Stack, StaticSite } from "../src";

process.env.SST_RESOURCES_TESTS = "enabled";

/////////////////////////////
// Test Constructor
/////////////////////////////

test("constructor: no domain", async () => {
  const stack = new Stack(new App(), "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeUndefined();
  expect(site.bucketArn).toBeDefined();
  expect(site.bucketName).toBeDefined();
  expect(site.distributionId).toBeDefined();
  expect(site.distributionDomain).toBeDefined();
  expect(site.cdk.certificate).toBeUndefined();
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Aliases: [],
      CustomErrorResponses: ABSENT,
      DefaultCacheBehavior: {
        CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        Compress: true,
        TargetOriginId: "devmyappstackSiteDistributionOrigin1F25265FA",
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
    FileOptions: [],
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
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: "domain.com",
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
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
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

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });

  const site = new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  const site = new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
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
    new StaticSite(stack, "Site", {
      path: "does-not-exist",
    });
  }).not.toThrow(/No path found/);
});

test("constructor: errorPage is string", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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

test("constructor: buildCommand error", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      buildCommand: "garbage command",
    });
  }).toThrow(/There was a problem building the "Site" StaticSite./);
});

test("constructor: buildOutput multiple files", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      buildOutput: "does-not-exist",
    });
  }).toThrow(/No build output found/);
});

test("constructor: fileOptions", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
    FileOptions: [],
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

test("cdk.bucket is props", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      cdk: {
        bucket: {
          websiteIndexDocument: "index.html",
        },
      },
    });
  }).toThrow(/Do not configure the "s3Bucket.websiteIndexDocument"./);
});

test("cdk.bucket is props: s3Bucket websiteErrorDocument", async () => {
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      cdk: {
        bucket: {
          websiteErrorDocument: "error.html",
        },
      },
    });
  }).toThrow(/Do not configure the "s3Bucket.websiteErrorDocument"./);
});

test("cdk.bucket is construct", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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

test("constructor: cfDistribution props override errorResponses", async () => {
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  expect(() => {
    new StaticSite(stack, "Site", {
      path: "test/site",
      cdk: {
        distribution: {
          domainNames: ["domain.com"],
        },
      },
    });
  }).toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

test("constructor: environment generates placeholders", async () => {
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
  const stack = new Stack(new App(), "stack");
  const api = new Api(stack, "Api");
  new StaticSite(stack, "Site", {
    path: "test/site",
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

/////////////////////////////
// Test Constructor for Local Debug
/////////////////////////////

test("constructor: local debug", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
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
    FileOptions: [],
    ReplaceValues: [],
  });
  countResources(stack, "Custom::SSTCloudFrontInvalidation", 1);
  hasResource(stack, "Custom::SSTCloudFrontInvalidation", {
    DistributionPaths: ["/*"],
  });
});

test("constructor: local debug with disablePlaceholder true", async () => {
  const app = new App({
    debugEndpoint: "placeholder",
  });
  const stack = new Stack(app, "stack");
  new StaticSite(stack, "Site", {
    path: "test/site",
    disablePlaceholder: true,
  });
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: objectLike({
      CustomErrorResponses: ABSENT,
    }),
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
    FileOptions: [],
    ReplaceValues: [],
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
  new StaticSite(stack, "Site", {
    path: "test/site",
  });
  countResources(stack, "Custom::SSTBucketDeployment", 1);
});

/////////////////////////////
// Test extending ()
/////////////////////////////

test("constructor: extending createRoute53Records", async () => {
  class MyStaticSite extends StaticSite {
    public dummy?: string;

    protected createRoute53Records(): void {
      this.dummy = "dummy";
    }
  }

  const stack = new Stack(new App(), "stack");
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
  const site = new MyStaticSite(stack, "Site", {
    path: "test/site",
    customDomain: "domain.com",
  });
  expect(site.url).toBeDefined();
  expect(site.customDomainUrl).toBeDefined();
  expect(site.dummy).toMatch("dummy");
  countResources(stack, "AWS::S3::Bucket", 1);
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  countResources(stack, "AWS::Route53::RecordSet", 0);
  countResources(stack, "AWS::Route53::HostedZone", 1);
});
