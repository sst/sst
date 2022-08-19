import { extend, extract, remove, patch } from "create-sst";
export default [
  extend("presets/base/starter"),
  extend("presets/base/monorepo"),
  extract(),
  remove("tsconfig.json"),
  patch({
    file: "sst.json",
    operations: [{ op: "add", path: "/main", value: "stacks/index.js" }],
  }),
  patch({
    file: "package.json",
    operations: [{ op: "remove", path: "/scripts/typecheck" }],
  }),
];
