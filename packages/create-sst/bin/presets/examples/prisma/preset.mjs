import { extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["prisma", "fs-extra", "@prisma/client"],
    path: "backend",
  }),
  install({
    packages: ["@types/fs-extra", "prisma"],
    path: "backend",
    dev: true,
  }),
];
