import { extend, extract, patch, install } from "create-sst";

export default [
  extend("presets/base/typescript"),
  extract(),
  install({
    packages: ["vitest"],
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [
      {
        op: "add",
        path: "/scripts/test",
        value: "sst bind -- vitest run",
      },
    ],
  }),
];
