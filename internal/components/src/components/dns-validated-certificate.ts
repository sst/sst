import {
  Input,
  Output,
  ComponentResource,
  ComponentResourceOptions,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Certificate, CertificateValidation } from "@pulumi/aws/acm";

/**
 * Properties to create a DNS validated certificate managed by AWS Certificate Manager.
 */
export interface DnsValidatedCertificateArgs {
  /**
   * The fully qualified domain name in the certificate.
   */
  domainName: Input<string>;
  /**
   * Route 53 Hosted Zone used to perform DNS validation of the request.  The zone
   * must be authoritative for the domain name specified in the Certificate Request.
   */
  zoneId: Input<string>;
  /**
   * Set of domains that should be SANs in the issued certificate
   */
  alternativeNames?: Input<string[]>;
  /**
   * AWS region that will host the certificate. This is needed especially
   * for certificates used for CloudFront distributions, which require the region
   * to be us-east-1.
   *
   * @default the region the stack is deployed in.
   */
  region?: aws.Region;
}

export class DnsValidatedCertificate extends ComponentResource {
  public certificateValidation: CertificateValidation;

  constructor(
    name: string,
    args: DnsValidatedCertificateArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Certificate", name, args, opts);

    const parent = this;
    const { domainName, alternativeNames, zoneId, region } = args;

    const certificate = new aws.acm.Certificate(
      `${name}-certificate`,
      {
        domainName,
        validationMethod: "DNS",
        subjectAlternativeNames: alternativeNames ?? [],
      },
      { parent }
    );

    const records: aws.route53.Record[] = [];
    certificate.domainValidationOptions.apply((options) => {
      options.forEach((option) => {
        records.push(
          new aws.route53.Record(
            `${name}-record-${option.resourceRecordName}`,
            {
              name: option.resourceRecordName,
              zoneId,
              type: option.resourceRecordType,
              records: [option.resourceRecordValue],
              ttl: 60,
            },
            { parent }
          )
        );
      });
    });

    const certificateValidation = new aws.acm.CertificateValidation(
      `${name}-validation`,
      {
        certificateArn: certificate.arn,
        validationRecordFqdns: records.map((record) => record.fqdn),
      },
      { parent }
    );

    this.certificateValidation = certificateValidation;
  }

  public get certificateArn() {
    return this.certificateValidation.certificateArn;
  }
}
