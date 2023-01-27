import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/graphql/basic"),
  extract(),
  install({
    packages: ["electrodb", "@aws-sdk/client-dynamodb"],
    path: "services",
  }),
];
