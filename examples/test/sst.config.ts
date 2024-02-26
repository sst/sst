/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app() {
    return {
      name: "test",
      removalPolicy: "retain-all",
      providers: {
        aws: {},
        cloudflare: {},
      },
    };
  },
  async run() {
    const vector = new sst.aws.Vector("Vector");
    return {};
  },
});
