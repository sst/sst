/// <reference path="./.sst/types/global.d.ts" />

export default {
  config() {
    return {
      name: "test",
      profile: "sst-dev",
    };
  },
  async run() {
    const a = new aws.s3.Bucket("my-bucket", {});
    return {
      url: util.interpolate`https://${a.bucketDomainName}`,
    };
  },
};
