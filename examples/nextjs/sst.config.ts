/// <reference path="./.sst/platform/config.d.ts" />

import { FunctionArgs } from "./.sst/platform/src/components/aws";

export default $config({
  app(input) {
    return {
      name: "nextjs",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket");
    new sst.aws.Nextjs("MyWeb", {
      link: [bucket],
      transform: {
        server: (args: FunctionArgs) => {
          args.timeout = "21 seconds";
        },
      },
    });
  },
});
