import { extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["datadog-cdk-constructs-v2"],
    dev: true,
  }),
];
