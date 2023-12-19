/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    const site = new sst.Nextjs("Web", {
      domain: {
        domainName: "ion-next.sst.sh",
        hostedZone: "sst.sh",
      },
    });

    //new sst.DistributionInvalidation(`invalidation`, {
    //  distributionId: "ESWUVI5JLK5EA",
    //  paths: ["/*"],
    //  wait: false,
    //  version: Date.now().toString(16),
    //});

    return {
      siteURL: site.url,
      bucketName: site.nodes?.bucket.bucket,
      distributionID: site.nodes?.distribution.nodes.distribution.id,
    };
  },
});
