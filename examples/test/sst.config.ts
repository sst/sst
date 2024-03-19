/// <reference path="./.sst/platform/config.d.ts" />

import { VisibleError } from "./.sst/platform/src/components/error";

export default $config({
  app(input) {
    return {
      name: "test",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Bucket("MyBucket");
  },
});
