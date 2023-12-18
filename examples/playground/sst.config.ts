/// <reference path="./.sst/src/global.d.ts" />

import path from "path";

export default $config({
  app() {
    return {
      name: "playground",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    const bucket = new sst.Bucket("Web", {
      nodes: {
        bucket: {
          forceDestroy: false,
        },
      },
    });
    throw "stop";
    return;

    //return {
    //  bucket: bucket.name,
    //};
    const files = [
      "_app-3e6c03fb96512a92.js",
      "_buildManifest.js",
      "_error-4fcb4dc62cb2bc0a.js",
      "_not-found-82a8529a57099a07.js",
      "_ssgManifest.js",
      "05a31a2ca4975f99-s.woff2",
      "46-7622317cc9c65f71.js",
      "51ed15f9841b9f9d-s.woff2",
      "54ffe052-b8a09c19b93b1bcd.js",
      "989-a01d5eb74b1baa9f.js",
      "513657b02c5c193f-s.woff2",
      "a3d073f013d3bc87.css",
      "BUILD_ID",
      "c9a5bc6a7c948fb0-s.p.woff2",
      "d6b16ce4a6175f26-s.woff2",
      "ec159349637c90ad-s.woff2",
      "ed4d508feb2dc8fd.css",
      "favicon.ico",
      "fd4db3eb5472fc27-s.woff2",
      "framework-a0dc7b86feec60d5.js",
      "layout-acc10c21c6762f77.js",
      "main-472dbb649e94a60d.js",
      "main-app-c597735a81573f13.js",
      "next.svg",
      "page-b3bdeea8851422fd.js",
      "polyfills-c67a75d1b6f99dc8.js",
      "vercel.svg",
      "webpack-e6edcd8ebd35b832.js",
    ];

    if (process.env.BULK) {
      new sst.BucketFiles(`Files`, {
        bucketName: bucket.name,
        dir: path.resolve("assets"),
        files: files,
      });
    } else {
      files.forEach((file) => {
        new aws.s3.BucketObjectv2(
          `File` +
            file.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() +
            Date.now().toString(16),
          {
            bucket: bucket.name,
            source: new util.asset.FileAsset(path.resolve("assets", file)),
            key: path.posix.join(file),
          }
        );
      });
    }
    return {
      bucket: bucket.name,
    };
  },
});
