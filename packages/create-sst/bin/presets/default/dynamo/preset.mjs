import { patch, extend, extract, install } from "create-sst";
export default [
  extend("presets/default/basic"),
  extract(),
  install({
    packages: ["electrodb", "@aws-sdk/client-dynamodb"],
    path: "services",
  }),
];
