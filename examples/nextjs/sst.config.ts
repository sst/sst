/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const site = new sst.cloudflare.Nextjs("Web");
  },
});
