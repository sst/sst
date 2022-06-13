import { extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["prisma", "fs-extra", "@prisma/client"],
    path: "api",
  }),
  install({
    packages: ["@types/fs-extra", "prisma"],
    path: "api",
    dev: true,
  }),
];
