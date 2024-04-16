/// <reference path="./.sst/platform/config.d.ts" />
/**
 * ## Vercel domains
 *
 * Creates a router that uses domains purchased through and hosted in your Vercel account.
 * Ensure the `VERCEL_API_TOKEN` and `VERCEL_TEAM_ID` environment variables are set.
 */
export default $config({
  app(input) {
    return {
      name: "vercel-domain",
      home: "aws",
      removal: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: true,
        "@pulumiverse/vercel": true,
      },
    };
  },
  async run() {
    const router = new sst.aws.Router("MyRouter", {
      domain: {
        name: "ion.sst.moe",
        dns: sst.vercel.dns({ domain: "sst.moe" }),
      },
      routes: {
        "/*": "https://sst.dev",
      },
    });
    return {
      router: router.url,
    };
  },
});
