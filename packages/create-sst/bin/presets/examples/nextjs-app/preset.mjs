import { extend, extract, install, patch } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["@sls-next/lambda-at-edge"],
    path: "services",
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "frontend" }],
  }),
];
