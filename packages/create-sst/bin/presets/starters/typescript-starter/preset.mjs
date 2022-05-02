import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/base/starter"),
  extend("presets/base/monorepo"),
  extract(),
  install({
    packages: ["@types/node", "@types/aws-lambda"],
    path: "backend",
    dev: true,
  }),
  patch({
    file: "backend/package.json",
    operations: [
      { op: "add", path: "/scripts/typecheck", value: "tsc --noEmit" },
    ],
  }),
];
