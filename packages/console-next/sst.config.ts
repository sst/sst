import { SSTConfig } from "sst";
import { API } from "./stacks/api";
import { Web } from "./stacks/web";
import { Auth } from "./stacks/auth";

export default {
  config(_input) {
    return {
      name: "console",
      region: "us-east-1",
      profile: "sst-dev",
    };
  },
  stacks(app) {
    app.stack(Auth).stack(API).stack(Web);
  },
} satisfies SSTConfig;
