import { patch, extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["node-fetch", "lambda-multipart-parser"],
  }),
];
