/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## React SPA with Vite
 *
 * Deploy a React single-page app (SPA) with Vite to S3 and CloudFront.
 */
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
