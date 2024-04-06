/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-vite",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    new sst.aws.StaticSite("Web", {
      build: {
        command: "pnpm run build",
        output: "dist",
      },
    });
  },
});
