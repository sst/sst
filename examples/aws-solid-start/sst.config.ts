/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "aws-solid-start",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-west-1",
        },
      },
    };
  },
  async run() {
    new sst.aws.SolidStart("MyApp", {
      buildCommand: "bun run build",
    });
  },
});
