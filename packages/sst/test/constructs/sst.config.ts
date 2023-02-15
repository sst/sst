import type { SSTConfig } from "../../src";

export default {
  config() {
    return {
      name: "app",
      region: "us-east-1",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;
