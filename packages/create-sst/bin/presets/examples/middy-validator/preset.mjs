import { extend, extract, install } from "create-sst";

export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: [
      "@middy/core",
      "@middy/http-error-handler",
      "@middy/http-json-body-parser",
      "@middy/validator",
    ],
  }),
];
