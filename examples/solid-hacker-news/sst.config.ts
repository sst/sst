/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "solid-hacker-news",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: { "@runpod-infra/pulumi": true },
    };
  },
  async run() {
    new sst.aws.SolidStart("SolidStart", {});
  },
});
