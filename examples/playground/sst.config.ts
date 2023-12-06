/// <reference path="./.sst/src/global.d.ts" />

export default {
  config() {
    return {
      name: "playground",
      region: "us-east-1",
    };
  },
  async run() {
    const site = new sst.Function("web", {
      runtime: "nodejs18.x",
      bundle: "bundled-function",
      handler: "index.handler",
      url: true,
      logging: {
        retention: "1 day",
      },
    });

    return {
      siteURL: site.url,
    };
  },
};
