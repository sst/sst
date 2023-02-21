import { cmd, patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  // Vanilla Extract doesn't support Vite 3 yet
  // https://github.com/seek-oss/vanilla-extract/issues/760
  cmd({ cmd: "npx create-vite@2.9.5 web --template=react" }),
  extract(),
  install({
    packages: ["@aws-sdk/client-dynamodb", "@aws-sdk/util-dynamodb"],
  }),
  patch({
    file: "web/package.json",
    operations: [{ op: "add", path: "/scripts/dev", value: "sst env vite" }],
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "web" }],
  }),
];
