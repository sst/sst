/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "remix",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const secret = new sst.Secret("MySecret");
    new sst.aws.Remix("MyWeb", {
      link: [secret],
    });
  },
});
