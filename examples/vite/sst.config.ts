/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "vite",
      providers: {
        aws: {},
      },
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    new sst.aws.StaticSite("Web", {
      build: {
        command: "bun run build",
        output: "dist",
      },
    });
  },
});
