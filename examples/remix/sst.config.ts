/// <reference path="./.sst/platform/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "remix",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    new sst.Remix("Web", {});
  },
});
