import pulumi from "@pulumi/pulumi";
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
  readonly zoneId: pulumi.Input<string>;

  /**
   * The redirect target fully qualified domain name (FQDN). An alias record
   * will be created that points to your CloudFront distribution. Root domain
   * or sub-domain can be supplied.
   */
  readonly targetDomain: string;

  /**
   * The domain names that will redirect to `targetDomain`
   *
   * @default - the domain name of the hosted zone
   */
  readonly sourceDomains: string[];
}

/**
 * Allows creating a domainA -> domainB redirect using CloudFront and S3.
 * You can specify multiple domains to be redirected.
 */
export class HttpsRedirect extends pulumi.ComponentResource {
  constructor(name: string, args: HttpsRedirectArgs) {
    super("sst:sst:HttpsRedirect", name, args);

    const { zoneId, targetDomain, sourceDomains } = args;

    const certificate = new DnsValidatedCertificate(`${name}-certificate`, {
      domainName: sourceDomains[0],
      alternativeNames: sourceDomains.slice(1),
      zoneId,
      region: "us-east-1",
    });

    const bucket = new aws.s3.BucketV2(`${name}-bucket`, {
      forceDestroy: true,
    });

    const bucketWebsite = new aws.s3.BucketWebsiteConfigurationV2(
      `${name}-bucket-website`,
      {
        bucket: bucket.id,
        redirectAllRequestsTo: {
          hostName: targetDomain,
          protocol: "https",
        },
      }
    );

    new aws.s3.BucketPublicAccessBlock(`${name}-bucket-public-access-block`, {
      bucket: bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    const distribution = new aws.cloudfront.Distribution(
      `${name}-distribution`,
      {
        enabled: true,
        waitForDeployment: false,
        aliases: sourceDomains,
        restrictions: {
          geoRestriction: {
            restrictionType: "none",
          },
        },
        comment: `Redirect to ${targetDomain} from ${sourceDomains.join(", ")}`,
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
      }
    );

    for (const recordName of sourceDomains) {
      for (const type of ["A", "AAAA"]) {
        new aws.route53.Record(`${name}-record-${recordName}-${type}`, {
          name: recordName,
          zoneId,
          type,
          aliases: [
            {
              name: distribution.domainName,
              zoneId: distribution.hostedZoneId,
              evaluateTargetHealth: true,
            },
          ],
        });
      }
    }
  }
}
