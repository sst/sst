/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "test",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        cloudflare: {
          apiToken: "qz9YssGBPcTBYbDQG0xMAOJ68_u0O0snua1ErKVB",
        },
      },
    };
  },
  async run() {
    const fn = new sst.aws.Function("MyFunction", {
      handler: "./src/streaming.handler",
      streaming: true,
      url: true,
      timeout: "15 minutes",
      copyFiles: [
        {
          from: "./package.json",
        },
      ],
    });

    new sst.cloudflare.Worker("Worker", {
      handler: "./src/index.ts",
      url: true,
    });
    return {
      url: fn.url,
    };
  },
});
