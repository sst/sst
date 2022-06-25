import { extract, patch, install, extend } from "create-sst";

export default [
  extend("presets/base/javascript"),
  extract(),
  install({
    packages: ["@serverless-stack/cli", "@serverless-stack/resources"],
    dev: true,
  }),
  extend("presets/base/javascript"),
  extract(),
  install({
    packages: ["typescript@~4.6.4", "@tsconfig/node16"],
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
