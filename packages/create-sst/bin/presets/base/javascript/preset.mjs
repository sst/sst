import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst@snapshot", "aws-cdk-lib@2.55.0", "constructs@10.1.156"],
    dev: true,
  }),
];
