/// <reference path="./.sst/src/global.d.ts" />

import * as pulumi from "@pulumi/pulumi";

export default $config({
  app() {
    return {
      name: "playground",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    const cron = new sst.Cron("Nightly", {
      schedule: "rate(1 minute)",
      job: {
        function: {
          bundle: "bundled-function",
          handler: "index.handler",
        },
      },
    });

    return {
      cronHandlerArn: cron.nodes.job.nodes.function.name,
    };
  },
});
