import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst", "aws-cdk-lib@2.91.0", "constructs@10.2.69"],
    dev: true,
  }),
];
