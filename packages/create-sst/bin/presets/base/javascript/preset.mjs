import { extract, patch, install } from "create-sst";

export default [
  extract(),
  install({
    packages: [
      "@serverless-stack/cli@1.0.0-beta.9",
      "@serverless-stack/resources@1.0.0-beta.9",
    ],
    dev: true,
  }),
];
