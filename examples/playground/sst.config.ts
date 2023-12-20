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
    // Observations:
    // 1. Has to be related to await aws.route53.getZone because if I replace that
    //    with a component error, the error is caught right away.
    // 2. Only happens when there are 2 components in the chain

    const zoneId = pulumi.output("foo").apply(async (domain) => {
      throw new Error("hi");
    });

    const fn = new aws.lambda.Function(`Function`, {
      role: zoneId,
    });

    new aws.lambda.Function(`Function2`, {
      role: fn.arn,
    });
  },
});
