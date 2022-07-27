import { extend, extract, install, patch } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["@thundra/esbuild-plugin"],
    path: "services",
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "frontend" }],
  }),
];
