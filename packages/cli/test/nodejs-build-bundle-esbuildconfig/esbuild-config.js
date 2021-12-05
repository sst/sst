import path from "path";
import esbuildPluginTsc from "esbuild-plugin-tsc";

module.exports = {
  plugins: [
    esbuildPluginTsc({
      tsconfigPath: path.resolve(__dirname, "tsconfig.json"),
      force: true,
    }),
  ],
};
