import type { SSTConfig } from "sst";
import { AstroSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "@@app",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site(ctx) {
      const site = new AstroSite(ctx.stack, "site");
      ctx.stack.addOutputs({
        url: site.url || "http://localhost:3000",
      });
    });
  },
} satisfies SSTConfig;
