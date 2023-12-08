import {
  ComponentResource,
  ComponentResourceOptions,
  Input,
  all,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { DnsValidatedCertificate } from "./dns-validated-certificate";

/**
 * Properties to configure an HTTPS Redirect
 */
export interface HttpsRedirectArgs {
  /**
   * Hosted zone of the domain which will be used to create alias record(s) from
   * domain names in the hosted zone to the target domain. The hosted zone must
   * contain entries for the domain name(s) supplied through `sourceDomains` that
   * will redirect to the target domain.
   *
   * Domain names in the hosted zone can include a specific domain (example.com)
   * and its subdomains (acme.example.com, zenith.example.com).
   *
   */
  readonly zoneId: Input<string>;

  /**
   * The redirect target fully qualified domain name (FQDN). An alias record
   * will be created that points to your CloudFront distribution. Root domain
   * or sub-domain can be supplied.
   */
  readonly targetDomain: Input<string>;

  /**
   * The domain names that will redirect to `targetDomain`
   *
   * @default - the domain name of the hosted zone
   */
  readonly sourceDomains: Input<string[]>;
}

/**
 * Allows creating a domainA -> domainB redirect using CloudFront and S3.
 * You can specify multiple domains to be redirected.
 */
export class HttpsRedirect extends ComponentResource {
  constructor(
    name: string,
    args: HttpsRedirectArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:HttpsRedirect", name, args, opts);

    const parent = this;

    const certificate = new DnsValidatedCertificate(
      `${name}-certificate`,
      {
        domainName: output(args.sourceDomains).apply((domains) => domains[0]),
        alternativeNames: output(args.sourceDomains).apply((domains) =>
          domains.slice(1)
        ),
        zoneId: args.zoneId,
        region: "us-east-1",
      },
      { parent }
    );

    const bucket = new aws.s3.BucketV2(
      `${name}-bucket`,
      {
        forceDestroy: true,
      },
      { parent }
    );

    const bucketWebsite = new aws.s3.BucketWebsiteConfigurationV2(
      `${name}-bucket-website`,
      {
        bucket: bucket.id,
        redirectAllRequestsTo: {
          hostName: args.targetDomain,
          protocol: "https",
        },
      },
      { parent }
    );

    new aws.s3.BucketPublicAccessBlock(
      `${name}-bucket-public-access-block`,
      {
        bucket: bucket.id,
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      { parent }
    );

    const distribution = new aws.cloudfront.Distribution(
      `${name}-distribution`,
      {
        enabled: true,
        waitForDeployment: false,
        aliases: args.sourceDomains,
        restrictions: {
          geoRestriction: {
            restrictionType: "none",
          },
        },
        comment: all([args.targetDomain, args.sourceDomains]).apply(
          ([targetDomain, sourceDomains]) =>
            `Redirect to ${targetDomain} from ${sourceDomains.join(", ")}`
        ),
        priceClass: "PriceClass_All",
        viewerCertificate: {
          acmCertificateArn: certificate.certificateArn,
          sslSupportMethod: "sni-only",
        },
        defaultCacheBehavior: {
          allowedMethods: ["GET", "HEAD", "OPTIONS"],
          targetOriginId: "s3Origin",
          viewerProtocolPolicy: "redirect-to-https",
          cachedMethods: ["GET", "HEAD"],
        },
        origins: [
          {
            originId: "s3Origin",
            domainName: bucketWebsite.websiteDomain,
          },
        ],
      },
      { parent }
    );

    output(args.sourceDomains).apply((sourceDomains) => {
      for (const recordName of sourceDomains) {
        for (const type of ["A", "AAAA"]) {
          new aws.route53.Record(
            `${name}-record-${recordName}-${type}`,
            {
              name: recordName,
              zoneId: args.zoneId,
              type,
              aliases: [
                {
                  name: distribution.domainName,
                  zoneId: distribution.hostedZoneId,
                  evaluateTargetHealth: true,
                },
              ],
            },
            { parent }
          );
        }
      }
    });
  }
}
