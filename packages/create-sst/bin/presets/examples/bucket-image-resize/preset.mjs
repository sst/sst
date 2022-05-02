import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["sharp"],
    path: "backend",
  }),
  install({
    packages: ["@types/sharp"],
    path: "backend",
    dev: true,
  }),
];
