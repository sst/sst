/// <reference path="./.sst/src/global.d.ts" />

import * as pulumi from "@pulumi/pulumi";

export default $config({
  app() {
    return {
      name: "playground",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
      removalPolicy: "remove",
    };
  },
  async run() {
    new sst.VectorDb("VectorDB", {});
  },
});
