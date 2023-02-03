import { extend, extract, install, patch } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["@thundra/esbuild-plugin"],

    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "frontend" }],
  }),
];
