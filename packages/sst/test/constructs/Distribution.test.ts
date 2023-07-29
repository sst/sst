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
  OriginProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Api, Stack, RemixSite } from "../../dist/constructs";
import { SsrSiteProps } from "../../dist/constructs/SsrSite";
import { appendFile } from "fs";
import {
  Distribution,
  DistributionProps,
} from "../../dist/constructs/Distribution.js";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";

process.env.SST_RESOURCES_TESTS = "enabled";
const sitePath = "test/constructs/remix-site";

type DistributionTestProps = Omit<DistributionProps, "cdk"> & {
  cdk?: DistributionProps["cdk"];
};
async function createDistribution(
  props?: DistributionTestProps | ((stack: Stack) => DistributionTestProps)
) {
  const app = await createApp();
  const stack = new Stack(app, "stack");
  const distribution = new Distribution(stack, "CDN", {
    cdk: {
      distribution: {
        defaultBehavior: {
          origin: new HttpOrigin("sst.dev"),
        },
      },
    },
    ...(typeof props === "function" ? props(stack) : props),
  });
  await app.finish();
  return { app, stack, distribution };
}

function mockHostedZoneLookup() {
  route53.HostedZone.fromLookup = vi
    .fn()
    .mockImplementation((scope, id, { domainName }) => {
      return new route53.HostedZone(scope, id, { zoneName: domainName });
    });
}

/////////////////////////////
// Test Constructor
/////////////////////////////

test("default without domain", async () => {
  const { distribution, stack } = await createDistribution();
  expect(distribution.url).toBeDefined();
  expect(distribution.cdk!.distribution.distributionId).toBeDefined();
  expect(distribution.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(distribution.cdk!.certificate).toBeUndefined();
  expect(distribution.cdk!.hostedZone).toBeUndefined();
  countResources(stack, "AWS::CloudFront::Distribution", 1);
  hasResource(stack, "AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: objectLike({
        TargetOriginId: "testappstackCDNDistributionOrigin1EF8E962C",
      }),
      Origins: [
        objectLike({
          DomainName: "sst.dev",
          Id: "testappstackCDNDistributionOrigin1EF8E962C",
        }),
      ],
    },
  });
});

test("default with domain", async () => {
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution({
    customDomain: "domain.com",
  });
  expect(distribution.url).toBeDefined();
  expect(distribution.customDomainUrl).toBeDefined();
  expect(distribution.cdk!.distribution.distributionId).toBeDefined();
  expect(distribution.cdk!.distribution.distributionDomainName).toBeDefined();
  expect(distribution.cdk!.certificate).toBeDefined();
  expect(distribution.cdk!.hostedZone).toBeDefined();
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
        "Fn::GetAtt": ["CDNDistributionD4FAE585", "DomainName"],
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
      Ref: "CDNHostedZone39A343FF",
    },
  });
  hasResource(stack, "AWS::Route53::RecordSet", {
    Name: "domain.com.",
    Type: "AAAA",
    AliasTarget: {
      DNSName: {
        "Fn::GetAtt": ["CDNDistributionD4FAE585", "DomainName"],
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
      Ref: "CDNHostedZone39A343FF",
    },
  });
  countResources(stack, "AWS::Route53::HostedZone", 1);
  hasResource(stack, "AWS::Route53::HostedZone", {
    Name: "domain.com.",
  });
});

test("customDomain: string", async () => {
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution({
    customDomain: "domain.com",
  });
  expect(distribution.customDomainUrl).toEqual("https://domain.com");
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
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution({
    customDomain: {
      domainName: "domain.com",
    },
  });
  expect(distribution.customDomainUrl).toEqual("https://domain.com");
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

test("customDomain: domainAlias", async () => {
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution({
    customDomain: {
      domainName: "domain.com",
      domainAlias: "www.domain.com",
    },
  });
  expect(distribution.customDomainUrl).toEqual("https://domain.com");
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
});

test("customDomain: hostedZone string", async () => {
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution({
    customDomain: {
      domainName: "www.domain.com",
      hostedZone: "domain.com",
    },
  });
  expect(distribution.customDomainUrl).toEqual("https://www.domain.com");
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
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution((stack) => ({
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
  expect(distribution.customDomainUrl).toEqual("https://www.domain.com");
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
  mockHostedZoneLookup();
  const { distribution, stack } = await createDistribution((stack) => ({
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
  expect(distribution.customDomainUrl).toEqual("https://www.domain.com");
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
  const { distribution, stack } = await createDistribution((stack) => ({
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
  expect(distribution.customDomainUrl).toEqual("https://www.domain.com");
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
    await createDistribution({
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
    await createDistribution((stack) => ({
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
    await createDistribution((stack) => ({
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
    }));
  }).rejects.toThrow(
    /Hosted zones can only be configured for domains hosted on Amazon Route 53/
  );
});

test("cdk.distribution: is props", async () => {
  const { distribution, stack } = await createDistribution({
    cdk: {
      distribution: {
        comment: "My Comment",
        defaultBehavior: {
          origin: new HttpOrigin("sst.dev"),
        },
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

test("cdk.distribution: certificate conflict", async () => {
  expect(async () => {
    await createDistribution((stack) => ({
      cdk: {
        distribution: {
          defaultBehavior: {
            origin: new HttpOrigin("sst.dev"),
          },
          certificate: new acm.Certificate(stack, "Cert", {
            domainName: "domain.com",
          }),
        },
      },
    }));
  }).rejects.toThrow(/Do not configure the "cfDistribution.certificate"/);
});

test("cdk.distribution: domainNames conflict", async () => {
  expect(async () => {
    await createDistribution({
      cdk: {
        distribution: {
          defaultBehavior: {
            origin: new HttpOrigin("sst.dev"),
          },
          domainNames: ["domain.com"],
        },
      },
    });
  }).rejects.toThrow(/Do not configure the "cfDistribution.domainNames"/);
});

test("createInvalidation not called", async () => {
  const { distribution, stack } = await createDistribution();
  countResources(stack, "Custom::CloudFrontInvalidator", 0);
});

test("createInvalidation called", async () => {
  const { distribution, stack } = await createDistribution();
  distribution.createInvalidation();
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    paths: ["/*"],
  });
});

test("createInvalidation called with buildId", async () => {
  const { distribution, stack } = await createDistribution();
  distribution.createInvalidation("abc");
  countResources(stack, "Custom::CloudFrontInvalidator", 1);
  hasResource(stack, "Custom::CloudFrontInvalidator", {
    buildId: "abc",
    paths: ["/*"],
  });
});
