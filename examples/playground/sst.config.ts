/// <reference path="./.sst/src/global.d.ts" />

import path from "path";

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
    const zoneId = util.output("foo").apply(async (domain) => {
      const zone = await aws.route53.getZone({ name: "ion-next.sst.sh" });
      return zone.zoneId;
    });

    const certificate = util.output(zoneId).apply((zoneId) => {
      return { arn: "foo" };
    });

    const fn = new aws.lambda.Function(`Function`, {
      role: certificate.arn,
    });
    new aws.lambda.Function(`Function2`, {
      role: fn.arn,
    });
  },
});
