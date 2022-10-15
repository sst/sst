import { Context } from "@serverless-stack/node/context/context.js";
import { useRuntimeHandlers } from "./handlers.js";
import { fetch } from "undici";
import { Logger } from "../logger/index.js";
import { useRuntimeServerConfig } from "./server.js";
import path from "path";
import fs from "fs";
import { useProjectRoot } from "../config/index.js";
import esbuild from "esbuild";

const API_VERSION = "2018-06-01";

export const useNodeHandler = Context.memo(async () => {
  const handlers = await useRuntimeHandlers();
  const server = useRuntimeServerConfig();
  const cache: Record<string, esbuild.BuildResult> = {};

  handlers.register({
    startWorker: async (workerID) => {
      new Promise(async () => {
        while (true) {
          Logger.debug(
            "node:",
            "fetching from",
            `${server.url}/localhost:12557/${workerID}/${API_VERSION}/runtime/invocation/next`
          );
          const result = await fetch(
            `${server.url}/${workerID}/${API_VERSION}/runtime/invocation/next`
          ).then((x) => x.json());

          await fetch(
            `${server.url}/${workerID}/${API_VERSION}/runtime/invocation/whatever/response`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify("Hello"),
            }
          );
        }
      });
    },
    canHandle: () => true,
    stopWorker: () => {},
    build: async (input) => {
      const exists = cache[input.functionID];
      if (exists?.rebuild) {
        const result = await exists.rebuild();
        cache[input.functionID] = result;
        return;
      }
      const dir = path.dirname(input.handler);
      const ext = path.extname(input.handler);
      const base = path.basename(input.handler).split(".")[0];
      const file = [
        ".ts",
        ".tsx",
        ".mts",
        ".cts",
        ".js",
        ".jsx",
        ".mjs",
        ".cjs",
      ]
        .map((ext) => path.join(dir, base + ext))
        .find((file) => {
          const p = path.join(input.srcPath, file);
          return fs.existsSync(p);
        })!;
      if (!file)
        throw new Error(`Cannot find a handler file for "${input.handler}"`);
      const root = await useProjectRoot();
      const target = path.join(
        input.out,
        path
          .relative(root, path.resolve(input.srcPath))
          .split(path.sep)
          .filter((x) => x !== "node_modules")
          .join(path.sep),
        path.dirname(file),
        base + ".js"
      );

      await esbuild.build({
        entryPoints: [path.join(input.srcPath, file)],
        platform: "node",
        format: "esm",
        target: "esnext",
        bundle: true,
        banner: {
          js: [
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
          ].join("\n"),
        },
        outfile: target,
      });
    },
  });
});
