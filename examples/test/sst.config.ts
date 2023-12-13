/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "test",
      region: "us-east-1",
      removalPolicy: "remove",
      providers: {
        aws: {
          region: "us-east-1",
          profile: "sst-dev",
        },
      },
    };
  },
  async run() {
    const b = new aws.s3.Bucket("bucket");
    return {
      bucket: b.bucket,
    };
  },
});
