import { SSTConfig } from "sst";
import { Cron, Bucket, AstroSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "quickstart-astro",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const bucket = new Bucket(stack, "public");
      const site = new AstroSite(stack, "site", {
        bind: [bucket],
      });
      new Cron(stack, "cron", {
        schedule: "rate(1 day)",
        job: {
          function: {
            bind: [bucket],
            handler: "functions/delete.handler",
          },
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
} satisfies SSTConfig;
