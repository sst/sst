/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "www",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          profile: input.stage === "production" ? "sst-production" : "sst-dev",
        },
      },
    };
  },
  async run() {
    new sst.aws.Astro("Astro", {});
  },
});
