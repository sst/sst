/// <reference path="./.sst/platform/config.d.ts" />

import path from "path";

/**
 * ## Router and bucket
 *
 * Creates a router that serves static files from the `public` folder of a given bucket.
 */
export default $config({
  app(input) {
    return {
      name: "aws-router-bucket",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    // Create a bucket that CloudFront can access
    const bucket = new sst.aws.Bucket("MyBucket", {
      access: "cloudfront",
    });

    // Upload the image to the `public` folder
    new aws.s3.BucketObjectv2("MyImage", {
      bucket: bucket.name,
      key: "public/spongebob.svg",
      contentType: "image/svg+xml",
      source: $asset("spongebob.svg"),
    });

    const router = new sst.aws.Router("MyRouter", {
      routes: {
        "/*": {
          bucket,
          rewrite: { regex: "^/(.*)$", to: "/public/$1" },
        },
      },
    });

    return {
      image: $interpolate`${router.url}/spongebob.svg`,
    };
  },
});
