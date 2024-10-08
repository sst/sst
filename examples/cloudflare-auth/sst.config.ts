/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudflare-auth",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const auth = new sst.cloudflare.Auth("Auth", {
      authenticator: {
        handler: "./authenticator.ts",
      },
    });
    return {
      url: auth.url,
    };
  },
});
