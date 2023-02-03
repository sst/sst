import { extract, patch, install, extend } from "create-sst";

export default [
  extend("presets/base/typescript"),
  extract(),
  install({
    dev: true,
    packages: ["@types/aws-lambda"],
  }),
];
