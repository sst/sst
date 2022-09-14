import { patch, remove, extend, extract, install } from "create-sst";
export default [
  extend("presets/graphql/basic"),
  extract(),
  install({
    packages: ["hygen"],
    dev: true
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/scripts/gen", value: "hygen" }]
  }),
  install({
    packages: ["kysely", "kysely-data-api"],
    path: "services"
  }),
];