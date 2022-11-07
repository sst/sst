import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["@serverless-stack/cli", "@serverless-stack/resources"],
    dev: true
  }),
  install({
    packages: ["@serverless-stack/node"]
  }),
];
