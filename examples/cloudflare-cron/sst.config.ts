/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Cloudflare Cron
 *
 * This example creates a Cloudflare Worker that runs on a schedule.
 *
 */
export default $config({
  app(input) {
    return {
      name: "cloudflare-cron",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const cron = new sst.cloudflare.Cron("Cron", {
      job: "index.ts",
      schedules: ["* * * * *"]
    });

    return {};
  },
});

