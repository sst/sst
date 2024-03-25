/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cf-vite",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
        cloudflare: {},
      },
      home: "aws",
    };
  },
  async run() {
    new sst.cloudflare.StaticSite("Web", {
      build: {
        command: "bun run build",
        output: "dist",
      },
      domain: "vite.sstion.com",
    });
  },
});
