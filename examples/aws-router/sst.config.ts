/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Here's how you create a Router on AWS.
 *
 * ```ts
 * console.log("foo");
 * ```
 *
 * This uses `Function` and `Router` components.
 */
export default $config({
  app(input) {
    return {
      name: "aws-router",
      providers: {
        aws: {},
      },
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const api = new sst.aws.Function("MyApi", {
      handler: "api.handler",
      url: true,
    });
    const router = new sst.aws.Router("MyRouter", {
      routes: {
        "/*": api.url,
      },
    });
    return {
      api: api.url,
      router: router.url,
    };
  },
});
