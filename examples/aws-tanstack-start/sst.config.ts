/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "aws-tanstack-start",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        stripe: "0.0.24",
      },
    };
  },
  async run() {
    new sst.aws.TanstackStart("MyWeb");
  },
});
