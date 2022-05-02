import { extract, patch, install, extend } from "create-sst";

export default [
  extend("presets/base/typescript"),
  extend("presets/base/monorepo"),
  extract(),
];
