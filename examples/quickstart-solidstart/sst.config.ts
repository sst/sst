import type { SSTConfig } from "sst";
import { Cron, Bucket, SolidStartSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "quickstart-solidstart",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const bucket = new Bucket(stack, "public");
      const site = new SolidStartSite(stack, "site", {
        bind: [bucket],
      });
      new Cron(stack, "cron", {
        schedule: "rate(1 day)",
        job: {
          function: {
            bind: [bucket],
            handler: "src/functions/delete.handler",
          },
        },
      });
      stack.addOutputs({
        url: site.url,
      });
    });
  },
} satisfies SSTConfig;
