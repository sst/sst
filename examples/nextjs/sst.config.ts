/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
      providers: {
        aws: {},
      },
    };
  },
  async run() {
    new sst.aws.Nextjs("Web", {
      //domain: "ion-next.sst.sh",
      //      domain: {
      //        domainName: "ion-next.sst.sh",
      //        aliases: ["ion-nextjs.sst.sh"],
      //        redirects: ["www.ion-next.sst.sh"],
      //        hostedZone: "sst.sh",
      //      },
    });
  },
});
