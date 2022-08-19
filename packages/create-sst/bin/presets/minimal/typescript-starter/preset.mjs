import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/base/starter"),
  extend("presets/base/monorepo"),
  patch({
    file: "sst.json",
    operations: [{ op: "add", path: "/main", value: "stacks/index.ts" }],
  }),
  extract(),
];
