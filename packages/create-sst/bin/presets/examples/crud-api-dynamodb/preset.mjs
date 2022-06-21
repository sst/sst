import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["uuid"],
    path: "services",
  }),
  install({
    packages: ["@types/uuid"],
    path: "services",
    dev: true,
  }),
];
