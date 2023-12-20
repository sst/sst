/// <reference path="./.sst/src/global.d.ts" />

import path from "path";

export default $config({
  app() {
    return {
      name: "playground",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    const zoneId = util.output("foo").apply(async (domain) => {
      const zone = await aws.route53.getZone({ name: "ion-next.sst.sh" });
      return zone.zoneId;
    });

    const certificate = util.output(zoneId).apply((zoneId) => {
      return new aws.acm.Certificate(`Certificate`, {
        domainName: "ion-next.sst.sh",
        validationMethod: "DNS",
        subjectAlternativeNames: [],
      });
    });

    const certificateValidation = new aws.acm.CertificateValidation(
      `Validation`,
      {
        certificateArn: certificate.arn,
        validationRecordFqdns: [],
      }
    );

    new aws.cloudfront.Distribution(`Distribution`, {
      aliases: [],
      viewerCertificate: {
        acmCertificateArn: certificateValidation.certificateArn,
        sslSupportMethod: "sni-only",
      },
      origins: [
        {
          originId: "function",
          domainName: "https://function.sst.sh",
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: "https-only",
            originReadTimeout: 20,
            originSslProtocols: ["TLSv1.2"],
          },
        },
      ],
      defaultRootObject: "",
      defaultCacheBehavior: {
        targetOriginId: "function",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD"],
        compress: true,
        cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
        functionAssociations: [],
      },
      customErrorResponses: [
        {
          errorCode: 404,
          responseCode: 200,
          responsePagePath: "/404.html",
        },
      ],
      enabled: true,
      restrictions: {
        geoRestriction: {
          restrictionType: "none",
        },
      },
      waitForDeployment: false,
    });
  },
});
