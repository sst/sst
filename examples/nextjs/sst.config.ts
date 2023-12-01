/// <reference path="./.sst/src/global.d.ts" />

export default {
  config() {
    return {
      name: "nextjs",
      //name: "updater",
      region: "us-east-1",
    };
  },
  async run() {
    //    new sst.FunctionCodeUpdater("updater", {
    //      functionName: "foo",
    //      s3Bucket: "xxxxx",
    //      s3Key: "yyyyy",
    //    });

    const site = new sst.Nextjs("web", {
      path: "web",
    });

    return {
      siteURL: site.url,
      bucketName: site.aws?.bucket.bucket,
      distributionID: site.aws?.distribution.aws.distribution.id,
    };
  },
};
