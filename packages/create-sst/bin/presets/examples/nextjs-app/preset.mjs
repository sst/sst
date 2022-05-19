import { extend, extract, install, patch } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["@sls-next/lambda-at-edge"],
    path: "backend",
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "frontend" }],
  }),
];
