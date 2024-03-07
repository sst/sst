/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "www",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {
          profile: input.stage === "production" ? "sst-production" : "sst-dev",
        },
      },
    };
  },
  async run() {
    const isPersonal = $app.stage !== "production" && $app.stage !== "dev";

    const domain =
      {
        production: "ion.sst.dev",
        dev: "dev.ion.sst.dev",
      }[$app.stage] || $app.stage + "dev.ion.sst.dev";

    const zone = isPersonal
      ? await aws.route53.getZone({
          name: domain,
        })
      : new aws.route53.Zone("Zone", {
          name: domain,
        });

    new sst.aws.Astro("Astro", {
      // domain: {
      //   domainName: domain,
      //   hostedZoneId: zone.zoneId,
      // },
    });
  },
});
