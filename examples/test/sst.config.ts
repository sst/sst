/// <reference path="./.sst/platform/config.d.ts" />
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
    const fn = new sst.aws.Function("MyFunction", {
      handler: "./src/index.handler",
      streaming: true,
      url: true,
      timeout: "15 minutes",
      copyFiles: [
        {
          from: "./package.json",
        },
      ],
    });
    const worker = new sst.cloudflare.Worker("MyWorker", {
      handler: "./src/worker.ts",
      url: true,
    });
    return {
      url: fn.url,
      worker: worker.url,
    };
  },
});
