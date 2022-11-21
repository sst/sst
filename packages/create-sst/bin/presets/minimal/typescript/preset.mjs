import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/base/typescript"),
  install({
    packages: ["vitest"],
    path: "services",
    dev: true,
  }),
  patch({
    file: "package.json",
    operations: [
      { op: "add", path: "/scripts/test", value: 'sst bind "vitest"' },
    ],
  }),
  extract(),
];
