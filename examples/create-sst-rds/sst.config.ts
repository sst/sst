import { SSTConfig } from "sst";
import { Api } from "./stacks/Api.js";
import { Database } from "./stacks/Database.js";
import { Web } from "./stacks/Web.js";

export default {
  config(_input) {
    return {
      name: "create-sst-rds",
      region: "us-east-1",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;

