/// <reference path="./.sst/types/global.d.ts" />

export default {
  config() {
    return {
      name: "test",
      region: "us-east-1",
      profile: "sst-dev",
    };
  },
  async run() {
    const a = new aws.s3.Bucket("my-bucket", {
      tags: {
        foo: "12",
      },
    });
    return {
      url: util.interpolate`https://${a.bucketDomainName}`,
    };
  },
};
