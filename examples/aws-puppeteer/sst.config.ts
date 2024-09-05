/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Puppeteer in Lambda
 *
 * To use Puppeteer in a Lambda function you need:
 *
 * 1. [`puppeteer-core`](https://www.npmjs.com/package/puppeteer-core)
 * 2. Chromium
 *    - In `sst dev`, we'll use a locally installed Chromium version.
 *    - In `sst deploy`, we'll use the [`@sparticuz/chromium`](https://github.com/sparticuz/chromium) package. It comes with a pre-built binary for Lambda.
 *
 * #### Chromium version
 *
 * Since Puppeteer has a preferred version of Chromium, we'll need to check the version of
 * Chrome that a given version of Puppeteer supports. Head over to the
 * [Puppeteer's Chromium Support page](https://pptr.dev/chromium-support) and check which
 * versions work together.
 *
 * For example, Puppeteer v23.1.1 supports Chrome for Testing 127.0.6533.119. So, we'll use the
 * v127 of `@sparticuz/chromium`.
 *
 * ```bash
 * npm install puppeteer-core@23.1.1 @sparticuz/chromium@127.0.0
 * ```
 *
 * #### Install Chromium locally
 *
 * To use this locally, you'll need to install Chromium.
 *
 * ```bash
 * npx @puppeteer/browsers install chromium@latest --path /tmp/localChromium
 * ```
 *
 * Once installed you'll see the location of the Chromium binary, `/tmp/localChromium/chromium/mac_arm-1350406/chrome-mac/Chromium.app/Contents/MacOS/Chromium`.
 *
 * Update this in your Lambda function.
 *
 * ```ts title="index.ts"
 * // This is the path to the local Chromium binary
 * const YOUR_LOCAL_CHROMIUM_PATH = "/tmp/localChromium/chromium/mac_arm-1350406/chrome-mac/Chromium.app/Contents/MacOS/Chromium";
 * ```
 *
 * You'll notice we are using the right binary with the `SST_DEV` environment variable.
 *
 * ```ts title="index.ts" {4-6}
 * const browser = await puppeteer.launch({
 *   args: chromium.args,
 *   defaultViewport: chromium.defaultViewport,
 *   executablePath: process.env.SST_DEV
 *     ? YOUR_LOCAL_CHROMIUM_PATH
 *     : await chromium.executablePath(),
 *   headless: chromium.headless,
 * });
 * ```
 *
 * #### Deploy
 *
 * We don't need a layer to deploy this because `@sparticuz/chromium` comes with a pre-built
 * binary for Lambda.
 *
 * :::note
 * As of writing this, `arm64` is not supported by `@sparticuz/chromium`.
 * :::
 *
 * We just need to set it in the [`nodejs.install`](/docs/component/aws/function#nodejs-install).
 *
 * ```ts title="sst.config.ts"
 * {
 *   nodejs: {
 *     install: ["@sparticuz/chromium"]
 *   }
 * }
 * ```
 *
 * And on deploy, SST will use the right binary.
 *
 * :::tip
 * You don't need to use a Lambda layer to use Puppeteer.
 * :::
 *
 * We are giving our function more memory and a longer timeout since running Puppeteer can
 * take a while.
 */
export default $config({
  app(input) {
    return {
      name: "aws-puppeteer",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.Function("MyFunction", {
      url: true,
      memory: "2 GB",
      timeout: "15 minutes",
      handler: "index.handler",
      nodejs: {
        install: ["@sparticuz/chromium"],
      },
    });

    return {
      url: api.url,
    };
  },
});
