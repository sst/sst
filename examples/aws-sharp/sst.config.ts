/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Sharp in Lambda
 *
 * Uses the [Sharp](https://sharp.pixelplumbing.com/) library to resize images. In this example,
 * it resizes a `logo.png` local file to 100x100 pixels.
 *
 * ```json title="sst.config.ts"
 * {
 *   nodejs: { install: ["sharp"] }
 * }
 * ```
 *
 * We don't need a layer to deploy this because `sharp` comes with a pre-built binary for Lambda.
 * This is handled by [`nodejs.install`](/docs/component/aws/function#nodejs-install).
 *
 * :::tip
 * You don't need to use a Lambda layer to use Sharp.
 * :::
 *
 * In dev, this uses the sharp npm package locally.
 *
 * ```json title="package.json"
 * {
 *   "dependencies": {
 *     "sharp": "^0.33.5"
 *   }
 * }
 * ```
 *
 * On deploy, SST will use the right binary from the sharp package for the target Lambda
 * architecture.
 */
export default $config({
  app(input) {
    return {
      name: "aws-sharp",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const func = new sst.aws.Function("MyFunction", {
      url: true,
      handler: "index.handler",
      nodejs: { install: ["sharp"] },
      copyFiles: [{ from: "logo.png" }],
    });

    return {
      url: func.url,
    };
  },
});
