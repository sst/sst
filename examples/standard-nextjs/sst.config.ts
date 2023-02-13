import { SSTConfig } from "sst";
import { Default } from "./stacks/Default";

export default {
  config(_input) {
    return {
      name: "standard-nextjs",
      region: "us-east-1",
    };
  },
  stacks(app) {    app.stack(Default)
},
} satisfies SSTConfig;
