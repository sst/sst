import { extend, extract, install } from "create-sst";

export default [
  extend("presets/minimal/typescript-starter"),
  extract(),
  install({
    packages: ["chrome-aws-lambda", "puppeteer", "puppeteer-core"],
  }),
];
