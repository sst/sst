import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["uuid"],
  }),
  install({
    packages: ["@types/uuid"],

    dev: true,
  }),
];
