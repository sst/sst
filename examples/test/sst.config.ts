/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "test",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
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

    return {
      url: fn.url,
    };
  },
});
