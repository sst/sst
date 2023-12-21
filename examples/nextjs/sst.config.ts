/// <reference path="./.sst/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const site = new sst.Nextjs("Web", {
      domain: "ion-next.sst.sh",
      //      domain: {
      //        domainName: "ion-next.sst.sh",
      //        aliases: ["ion-nextjs.sst.sh"],
      //        redirects: ["www.ion-next.sst.sh"],
      //        hostedZone: "sst.sh",
      //      },
    });

    return {
      siteURL: site.url,
    };
  },
});
