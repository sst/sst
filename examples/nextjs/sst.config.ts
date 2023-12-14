/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app() {
    return {
      name: "nextjs",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    const site = new sst.Nextjs("web");

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
