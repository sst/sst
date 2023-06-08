import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.79.1", "constructs@10.1.156"],
    dev: true,
  }),
];
