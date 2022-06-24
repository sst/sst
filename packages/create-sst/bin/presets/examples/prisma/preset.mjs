import { extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["prisma", "fs-extra", "@prisma/client"],
    path: "services",
  }),
  install({
    packages: ["@types/fs-extra", "prisma"],
    path: "services",
    dev: true,
  }),
];
