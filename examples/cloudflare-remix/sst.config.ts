/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudflare-remix",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    new sst.cloudflare.Remix("MyWeb");
  },
});
