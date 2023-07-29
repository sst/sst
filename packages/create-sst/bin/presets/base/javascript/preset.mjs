import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.84.0", "constructs@10.1.156"],
    dev: true,
  }),
];
