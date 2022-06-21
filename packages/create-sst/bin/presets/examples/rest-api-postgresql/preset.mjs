import { extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["kysely", "kysely-data-api"],
    path: "services",
  }),
];
