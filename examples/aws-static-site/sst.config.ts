/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Simple static site
 *
 * Deploy a simple HTML file as a static site with S3 and CloudFront.
 */
export default $config({
  app(input) {
    return {
      name: "aws-static-site",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    // Deploys the current directory as a static site
    new sst.aws.StaticSite("MySite", {
      path: "./dist",
    });
  },
});
