import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.101.1", "constructs@10.2.69"],
    dev: true,
  }),
];
