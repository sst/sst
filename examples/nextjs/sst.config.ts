/// <reference path="./.sst/src/global.d.ts" />

export default {
  config() {
    return {
      name: "nextjs",
      region: "us-east-1",
    };
  },
  async run() {
    const site = new sst.Nextjs("web", {
      path: "web",
    });

    //new sst.DistributionInvalidation(`invalidation`, {
    //  distributionId: "ESWUVI5JLK5EA",
    //  paths: ["/*"],
    //  wait: false,
    //  version: Date.now().toString(16),
    //});

    return {
      siteURL: site.url,
      bucketName: site.aws?.bucket.bucket,
      distributionID: site.aws?.distribution.aws.distribution.id,
    };
  },
};
