/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudflare-hono",
      home: "cloudflare",
    };
  },
  async run() {
    const hono = new sst.cloudflare.Worker("Hono", {
      handler: "index.ts",
      url: true,
    });
    return {
      api: hono.url,
    };
  },
});
