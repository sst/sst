/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "base-ts",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // on first deploy this can take a while ~ 10 minutes
    const pg = new sst.aws.Postgres("Postgres");
    const fn = new sst.aws.Function("Function", {
      link: [pg],
      url: true,
      handler: "./src/index.handler",
    });
    return {
      url: fn.url,
    };
  },
});
