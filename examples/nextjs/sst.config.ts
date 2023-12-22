/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const site = new sst.Nextjs("Web", {
      domain: "ion-next.sst.st",
    });

    return {
      siteURL: site.url,
    };
  },
});
