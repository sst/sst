import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["uuid"],
    path: "api",
  }),
  install({
    packages: ["@types/uuid"],
    path: "api",
    dev: true,
  }),
];
