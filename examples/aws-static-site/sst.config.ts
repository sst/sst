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
    const cfFunction = new aws.cloudfront.Function("MySiteFunction", {
      code: `
    function handler(event) {
        var request = event.request;
        var uri = request.uri;
        
        // Check whether the URI is missing a file name.
        if (uri.endsWith('/')) {
            request.uri += 'index.html';
        } 
        // Check whether the URI is missing a file extension.
        else if (!uri.includes('.')) {
            request.uri += '/index.html';
        }

        return request;
    }`,
      runtime: "cloudfront-js-1.0",
      comment: "A function to add 'index.html' to missing URIs",
    });
    // Deploys the current directory as a static site
    new sst.aws.StaticSite("MySite", {
      path: "./dist",
      /*
      transform: {
        cdn: (args) => {
          // @ts-expect-error
          args.defaultCacheBehavior.functionAssociations = [
            {
              eventType: "viewer-request",
              functionArn: cfFunction.arn,
            },
          ];
        },
      },
      */
    });
  },
});
