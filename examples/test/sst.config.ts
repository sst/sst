/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "test",
      region: "us-east-1",
      removalPolicy: "remove",
      providers: {
        aws: {
          profile: "sst-dev",
        },
      },
    };
  },
  async run() {
    const item = new aws.s3.Bucket("Item");
  },
});
