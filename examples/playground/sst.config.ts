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
        cloudflare: {
          accountId: "24beb0945bae6b37c2b147db108c6ec8",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    const worker = new sst.Worker("Page", {
      handler: "worker/index.ts",
      devUrl: true,
    });

    return { url: worker.devUrl };
  },
});
