import { extend, extract, patch } from "create-sst";
export default [
  extend("presets/base/javascript"),
  extract(),
  install({
    packages: ["vitest"],
    path: "services",
    dev: true,
  }),
  install({
    packages: ["sst@snapshot"],
    path: "services",
  }),
  patch({
    file: "services/package.json",
    operations: [
      { op: "add", path: "/scripts/test", value: "sst bind 'vitest'" },
    ],
  }),
];
