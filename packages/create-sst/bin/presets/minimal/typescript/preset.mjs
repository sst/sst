import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/base/typescript"),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/workspaces/-", value: "services" }],
  }),
  extract(),
  install({
    packages: ["vitest", "@types/aws-lambda"],
    path: "services",
    dev: true,
  }),
  patch({
    file: "services/package.json",
    operations: [
      { op: "add", path: "/scripts/typecheck", value: "tsc --noEmit" },
    ],
  }),
];
