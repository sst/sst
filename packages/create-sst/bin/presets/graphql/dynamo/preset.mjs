import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/graphql/basic"),
  extract(),
  install({
    packages: ["electrodb", "@aws-sdk/client-dynamodb"],
    path: "packages/core",
  }),
  install({
    packages: ["@aws-sdk/types","@aws-sdk/smithy-client"],
    path: "packages/core",
    dev: true
  }),
];
