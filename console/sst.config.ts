import { SSTConfig } from "sst";
import { API } from "./stacks/api";
import { Web } from "./stacks/web";
import { Auth } from "./stacks/auth";
import { Secrets } from "./stacks/secrets";
import { Events } from "./stacks/events";

export default {
  config(_input) {
    return {
      name: "console",
      region: "us-east-1",
      profile: "sst-dev",
    };
  },
  stacks(app) {
    app.stack(Secrets).stack(Auth).stack(Events).stack(API).stack(Web);
  },
} satisfies SSTConfig;
