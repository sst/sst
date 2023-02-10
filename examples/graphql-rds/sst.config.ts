import { SSTConfig } from "sst";

export default {
  config(_input) {
    return {
      name: "graphql-rds",
      region: "us-east-1",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;

