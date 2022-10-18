import { Context } from "@serverless-stack/node/context/context.js";
import { useRuntimeHandlers } from "./handlers.js";
import path from "path";
import fs from "fs";
import { useProjectRoot } from "../config/index.js";
import esbuild from "esbuild";
import url from "url";
import { Worker } from "worker_threads";
import { useRuntimeWorkers } from "./workers.js";

export const useNodeHandler = Context.memo(async () => {
  const handlers = await useRuntimeHandlers();
  const workers = await useRuntimeWorkers();
  const cache: Record<string, esbuild.BuildResult> = {};
  const root = await useProjectRoot();
  const threads = new Map<string, Worker>();

  handlers.register({
    shouldBuild: (input) => {
      const result = cache[input.functionID];
      if (!result) return false;
      const relative = path.relative(root, input.file);
      return Boolean(result.metafile?.inputs[relative]);
    },
    startWorker: async (input) => {
      new Promise(async () => {
        process.chdir(input.out);
        const worker = new Worker(
          url.fileURLToPath(
            new URL("./support/nodejs-runtime/index.mjs", import.meta.url)
          ),
          {
            env: input.environment,
            workerData: input,
          }
        );
        worker.on("exit", () => workers.exited(input.workerID));
        threads.set(input.workerID, worker);
      });
    },
    canHandle: () => true,
    stopWorker: async (workerID) => {
      const worker = threads.get(workerID);
      await worker?.terminate();
    },
    build: async (input) => {
      const exists = cache[input.functionID];
      const dir = path.dirname(input.handler);
      const ext = path.extname(input.handler);
      const base = path.basename(input.handler).split(".")[0];
      const root = await useProjectRoot();
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
      const target = path.join(
        input.out,
        path
          .relative(root, path.resolve(input.srcPath))
          .split(path.sep)
          .filter((x) => x !== "node_modules")
          .join(path.sep),
        path.dirname(file),
        base + ".mjs"
      );
      const handler = path.relative(input.out, target.replace(".mjs", ext));
      if (exists?.rebuild) {
        const result = await exists.rebuild();
        cache[input.functionID] = result;
        return handler;
      }
      if (!file)
        throw new Error(`Cannot find a handler file for "${input.handler}"`);

      const result = await esbuild.build({
        entryPoints: [path.join(input.srcPath, file)],
        platform: "node",
        format: "esm",
        target: "esnext",
        bundle: true,
        metafile: true,
        banner: {
          js: [
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
          ].join("\n"),
        },
        outfile: target,
      });
      cache[input.functionID] = result;
      return handler;
    },
  });
});
