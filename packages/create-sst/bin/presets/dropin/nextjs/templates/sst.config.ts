import { SSTConfig } from "sst";
import { NextjsSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "@@app",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site(ctx) {
      const site = new NextjsSite(ctx.stack, "site", {
        path: ".",
      });
    });
  },
} satisfies SSTConfig;
