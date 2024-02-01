import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.124.0", "constructs@10.3.0"],
    dev: true,
  }),
];
