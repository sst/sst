import { SSTConfig } from "sst";

export default {
  config(_input) {
    return {
      name: "create-sst-dynamo",
      region: "us-east-1",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;

