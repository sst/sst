import { extend, extract, patch } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "web" }],
  }),
];
