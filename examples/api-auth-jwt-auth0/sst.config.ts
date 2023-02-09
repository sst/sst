import { SSTConfig } from "sst";
import { ExampleStack } from "./stacks/ExampleStack"
import { Api } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "api-auth-jwt-auth0",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ExampleStack)
  },
} satisfies SSTConfig;
