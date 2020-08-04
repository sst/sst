const path = require("path");

module.exports = {
  target: "node",
  mode: "development",
  stats: "errors-only",
  devtool: "inline-source-map",
  entry: "./scripts/wrapper/include.js",
  output: {
    filename: "include.js",
    libraryTarget: "commonjs2",
    path: path.resolve("./scripts/wrapper", "dist"),
  },
};
