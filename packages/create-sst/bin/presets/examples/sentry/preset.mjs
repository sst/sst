import { extend, extract, install } from "create-sst";

export default [
  extend("presets/starters/typescript-starter"),
  extract(),
  install({
    packages: "@sentry/serverless",
    path: "backend",
  }),
];
