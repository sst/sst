/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-static-site",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
      backend: "aws",
    };
  },
  async run() {
    new sst.cloudflare.StaticSite("MySite", {
      domain: {
        hostname: "static.sstion.com",
        zoneId: "415e6f4652b6d95b775d350f32119abb",
      },
    });
  },
});
