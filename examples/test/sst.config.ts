/// <reference path="./.sst/platform/config.d.ts" />

import { ApiGatewayV2 } from "./.sst/platform/src/components/aws";

export default $config({
  app(input) {
    return {
      name: "test",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        cloudflare: true,
      },
    };
  },
  async run() {
    const bucket = new sst.cloudflare.Bucket("MyBucket");
    const worker = new sst.cloudflare.Worker("MyWorker", {
      handler: "./src/worker.ts",
      link: [bucket],
      url: true,
    });
    return {
      worker: worker.url,
    };
  },
});
