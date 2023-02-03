import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["sharp"],
  }),
  install({
    packages: ["@types/sharp"],

    dev: true,
  }),
];
