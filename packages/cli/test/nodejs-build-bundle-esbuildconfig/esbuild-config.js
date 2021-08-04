const path = require("path");
const esbuildPluginTsc = require("esbuild-plugin-tsc");

module.exports = {
  plugins: [
    esbuildPluginTsc({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      force: true,
    }),
  ],
};
