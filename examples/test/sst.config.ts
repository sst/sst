/// <reference path="./.sst/src/global.d.ts" />

export default {
  config() {
    return {
      name: "test",
      region: "us-east-1",
      profile: "sst-dev",
    };
  },
  async run() {
    const bucket = new aws.s3.Bucket("my-bucket");

    const west = new aws.Provider("west", {
      region: "us-west-2",
    });

    new aws.s3.Bucket(
      "my-bucket-west",
      {},
      {
        provider: west,
      },
    );

    return {
      url: util.interpolate`https://${bucket.bucketDomainName}`,
    };
  },
};
