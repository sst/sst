import { extend, extract, patch } from "create-sst";
export default [
  extend("presets/base/javascript"),
  extract(),
  patch({
    file: "services/package.json",
    operations: [
      { op: "add", path: "/scripts/test", value: "sst bind 'vitest'" },
    ],
  }),
];
