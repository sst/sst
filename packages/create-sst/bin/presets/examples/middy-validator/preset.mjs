import { extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: [
      "@middy/core",
      "@middy/http-error-handler",
      "@middy/http-json-body-parser",
      "@middy/validator",
    ],
    path: "backend",
  }),
];
