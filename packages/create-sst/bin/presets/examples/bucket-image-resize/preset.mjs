import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["sharp"],
    path: "services",
  }),
  install({
    packages: ["@types/sharp"],
    path: "services",
    dev: true,
  }),
];
