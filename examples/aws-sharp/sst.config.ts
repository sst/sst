/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Sharp image resizer
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
 * The sharp package is handled by `nodejs.install`. In dev, this uses the sharp npm package locally.
 *
 * ```json title="package.json"
 * {
 *   "dependencies": {
 *     "sharp": "^0.33.5"
 *   }
 * }
 * ```
 *
 * On deploy, the sharp package for the right target Lambda architecture is used.
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
