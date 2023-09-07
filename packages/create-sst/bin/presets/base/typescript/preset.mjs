import { extract, patch, install, extend } from "create-sst";

export default [
  extend("presets/base/javascript"),
  extract(),
  install({
    packages: ["typescript", "@tsconfig/node18"],
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/scripts/typecheck", value: "tsc --noEmit" },
    ],
  }),
];
