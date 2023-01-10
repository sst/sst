import common from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import { copyFileSync, renameSync } from "fs";
import { join } from "path";
import { rollup } from "rollup";
import { fileURLToPath } from "url";

export default function ({ edge } = {}) {
  return {
    name: "aws",
    start() { },
    async build(config, builder) {
      const __dirname = fileURLToPath(new URL(".", import.meta.url));

      // SSR Edge Function
      if (!config.solidOptions.ssr) {
        await builder.spaClient(join(config.root, "dist", "client"));
        await builder.server(join(config.root, ".solid", "server"));
      } else if (config.solidOptions.islands) {
        await builder.islandsClient(join(config.root, "dist", "client"));
        await builder.server(join(config.root, ".solid", "server"));
      } else {
        await builder.client(join(config.root, "dist", "client"));
        await builder.server(join(config.root, ".solid", "server"));
      }

      copyFileSync(
        join(__dirname, edge ? "entry-edge.mjs" : "entry.mjs"),
        join(config.root, ".solid", "server", "index.mjs")
      );
      const bundle = await rollup({
        input: join(config.root, ".solid", "server", "index.mjs"),
        plugins: [
          json(),
          nodeResolve({
            preferBuiltins: true,
            exportConditions: ["node", "solid"]
          }),
          common()
        ]
      });
      await bundle.write({
        format: "esm",
        dir: join(config.root, "dist", "server")
      });
      renameSync(
        join(config.root, "dist", "server", "index.js"),
        join(config.root, "dist", "server", "index.mjs")
      );

      // closes the bundle
      await bundle.close();
    }
  };
}