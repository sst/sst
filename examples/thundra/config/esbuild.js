/* eslint-disable @typescript-eslint/no-var-requires */
const { ThundraEsbuildPlugin } = require("@thundra/esbuild-plugin");

module.exports = [
  ThundraEsbuildPlugin({
    traceableConfigs: [
      "src.*.*[traceLineByLine=true]", // activate line by line tracing for all files/methods under src folder
    ],
  }),
];
