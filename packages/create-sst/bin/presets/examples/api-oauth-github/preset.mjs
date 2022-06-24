import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: ["node-fetch", "lambda-multipart-parser"],
    path: "services",
  }),
];
