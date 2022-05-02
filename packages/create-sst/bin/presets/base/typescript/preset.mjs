import { extract, patch, install, extend } from "create-sst";

export default [
  extend("presets/base/javascript"),
  extract(),
  install({
    packages: [
      "@serverless-stack/cli@1.0.0-beta.9",
      "@serverless-stack/resources@1.0.0-beta.9",
    ],
    dev: true,
  }),
  extend("presets/base/javascript"),
  extract(),
  install({
    packages: ["typescript", "@tsconfig/node14"],
    dev: true,
  }),
  patch({
    file: "sst.json",
    operations: [{ op: "add", path: "/main", value: "stacks/index.ts" }],
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/scripts/typecheck", value: "tsc --noEmit" },
    ],
  }),
];
