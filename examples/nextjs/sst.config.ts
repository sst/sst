/// <reference path="./.sst/src/global.d.ts" />

export default {
  config() {
    return {
      name: "nextjs",
      region: "us-east-1",
    };
  },
  async run() {
    const site = new sst.SsrSite("web", {
      path: "web",
    });

    return {
      siteURL: util.interpolate`https://${site.distribution.domainName}`,
    };
  },
};
