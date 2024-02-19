/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
      },
    };
  },
  async run() {
    new sst.aws.Nextjs("Web", {});

    return {
      secret: $util.secret("secret"),
      normal: "normal",
    };
  },
});
