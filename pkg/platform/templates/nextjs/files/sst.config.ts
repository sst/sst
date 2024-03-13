/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "{{.App}}",
      removal: input?.stage === "production" ? "retain" : "remove",
    };
  },
  async run() {
    const site = new sst.aws.Nextjs("Web");
  },
});
