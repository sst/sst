import { extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["puppeteer-core^20.1.2", "@sparticuz/chromium^113.0.1"],
  }),
];
