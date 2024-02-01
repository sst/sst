/// <reference path="./.sst/platform/src/global.d.ts" />

export default $config({
  app(input) {
    return {
      name: "astro",
      removalPolicy: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    new sst.Astro("Web");
  },
});
