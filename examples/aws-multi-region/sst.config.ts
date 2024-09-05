/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-multi-region",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const east = new sst.aws.Function("East", {
      handler: "index.handler",
      url: true,
    });

    const provider = new aws.Provider("WestProvider", { region: "us-west-2" });
    const west = new sst.aws.Function(
      "West",
      {
        handler: "index.handler",
        url: true,
      },
      { provider }
    );

    return {
      east: east.url,
      west: west.url,
    };
  },
});
