import type { SSTConfig } from "sst";
import { Cron, Bucket, RemixSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "quickstart-remix",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const bucket = new Bucket(stack, "public");
      const site = new RemixSite(stack, "site", {
        permissions: [bucket],
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      });
      new Cron(stack, "cron", {
        schedule: "rate(1 day)",
        job: {
          function: {
            permissions: [bucket],
            environment: {
              BUCKET_NAME: bucket.bucketName,
            },
            handler: "functions/delete.handler",
          },
        },
      });
      stack.addOutputs({
        url: site.url,
      });
    });
  },
} satisfies SSTConfig;
