import { extend, extract, install, patch } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["@sls-next/lambda-at-edge"],
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "frontend" }],
  }),
];
