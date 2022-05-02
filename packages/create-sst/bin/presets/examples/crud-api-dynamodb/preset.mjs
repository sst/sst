import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["uuid"],
    path: "backend",
  }),
  install({
    packages: ["@types/uuid"],
    path: "backend",
    dev: true,
  }),
];
