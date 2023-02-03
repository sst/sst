import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["uuid"],
  }),
  install({
    packages: ["@types/uuid"],

    dev: true,
  }),
];
