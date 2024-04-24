/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-copy-files",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const fn = new sst.aws.Function("MyFunction", {
      handler: "index.handler",
      url: true,
      copyFiles: [
        {
          from: "./files",
        },
      ],
    });
    return {
      url: fn.url,
    };
  },
});
