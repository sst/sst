/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudflare-static-site",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        cloudflare: true,
      },
      home: "aws",
    };
  },
  async run() {
    new sst.cloudflare.StaticSite("MySite", {
      domain: "static.sstion.com",
    });
  },
});
