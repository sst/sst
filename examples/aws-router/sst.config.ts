/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Router and function URL
 *
 * Creates a router that routes all requests to a function with a URL.
 */
export default $config({
  app(input) {
    return {
      name: "aws-router",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const api = new sst.aws.Function("MyApi", {
      handler: "api.handler",
      url: true,
    });
    const router = new sst.aws.Router("MyRouter", {
      domain: "router.ion.dev.sst.dev",
      routes: {
        "/*": api.url,
      },
    });

    return {
      router: router.url,
    };
  },
});
