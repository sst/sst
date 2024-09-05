/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## AWS multi-region
 *
 * To deploy resources to multiple AWS regions, you can create a new provider for the region
 * you want to deploy to.
 *
 * ```ts title="sst.config.ts"
 * const provider = new aws.Provider("MyProvider", { region: "us-west-2" });
 * ```
 *
 * And then pass that in to the resource.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Function("MyFunction", { handler: "index.handler" }, { provider });
 * ```
 *
 * If no provider is passed in, the default provider will be used. And if no region is
 * specified, the default region from your credentials will be used.
 */
export default $config({
  app(input) {
    return {
      name: "aws-multi-region",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const east = new sst.aws.Function("MyEastFunction", {
      url: true,
      handler: "index.handler",
    });

    const provider = new aws.Provider("MyWestProvider", { region: "us-west-2" });
    const west = new sst.aws.Function(
      "MyWestFunction",
      {
        url: true,
        handler: "index.handler",
      },
      { provider }
    );

    return {
      east: east.url,
      west: west.url,
    };
  },
});
