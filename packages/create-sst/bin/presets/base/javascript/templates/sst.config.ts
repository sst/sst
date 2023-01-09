import { SSTConfig } from "sst";

export default {
  config(_input) {
    return {
      name: "@@app",
      region: "us-east-1"
    }
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "nodejs16.x",
      architecture: "arm_64",
    })
  }
} satisfies SSTConfig
