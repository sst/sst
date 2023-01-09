import { patch, extend, extract, install } from "create-sst";

export default [
  extract(),
  install({
    packages: ["sst@rc", "aws-cdk-lib@2.55.0", "constructs@10.1.156"],
    dev: true,
  }),
];
