import path from "path";
import fs from "fs";
import { useProject } from "../app.js";
import esbuild from "esbuild";
import url from "url";
import { Worker } from "worker_threads";
import { useRuntimeHandlers } from "./handlers.js";
import { useRuntimeWorkers } from "./workers.js";
import { Context } from "../context/context.js";

export const useNodeHandler = Context.memo(() => {
  const workers = useRuntimeWorkers();
  const handlers = useRuntimeHandlers();
  const cache: Record<string, esbuild.BuildResult> = {};
  const project = useProject();
  const threads = new Map<string, Worker>();

  handlers.register({
    shouldBuild: (input) => {
      const result = cache[input.functionID];
      if (!result) return false;
      const relative = path.relative(project.paths.root, input.file);
      return Boolean(result.metafile?.inputs[relative]);
    },
    startWorker: async (input) => {
      new Promise(async () => {
        const worker = new Worker(
          url.fileURLToPath(
            new URL("../support/nodejs-runtime/index.mjs", import.meta.url)
          ),
          {
            env: input.environment,
            workerData: input,
            stdout: true,
            stderr: true,
          }
        );
        worker.stdout.on("data", (data: Buffer) => {
          workers.stdout(input.workerID, data.toString());
        });
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
      const parsed = path.parse(input.props.handler!);
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
        .map((ext) => path.join(parsed.dir, parsed.name + ext))
        .find((file) => {
          return fs.existsSync(file);
        })!;
      if (!file)
        throw new Error(
          `Cannot find a handler file for "${input.props.handler}"`
        );

      const nodejs = input.props.nodejs || {};
      const isESM = (nodejs?.format || "esm") === "esm";

      const relative = path.relative(
        project.paths.root,
        path.resolve(parsed.dir)
      );

      const target = path.join(
        input.out,
        !relative.startsWith("..") && !path.isAbsolute(relative)
          ? relative
          : "",
        parsed.name + (isESM ? ".mjs" : ".js")
      );
      const handler = path.relative(
        input.out,
        target.replace(".js", parsed.ext).replace(".mjs", parsed.ext)
      );
      if (exists?.rebuild) {
        const result = await exists.rebuild();
        cache[input.functionID] = result;
        return {
          handler,
        };
      }

      const { external, ...override } = nodejs?.esbuild || {};

      const result = await esbuild.build({
        entryPoints: [file],
        platform: "node",
        external: [
          ...(nodejs?.externalModules || []),
          ...(nodejs?.nodeModules || []),
          ...(external || []),
        ],
        bundle: true,
        metafile: true,
        ...(isESM
          ? {
              format: "esm",
              target: "esnext",
              mainFields: isESM ? ["module", "main"] : undefined,
              banner: {
                js: [
                  `import { createRequire as topLevelCreateRequire } from 'module';`,
                  `const require = topLevelCreateRequire(import.meta.url);`,
                  nodejs.banner || "",
                ].join("\n"),
              },
              outExtension: {
                ".js": ".mjs",
              },
            }
          : {
              format: "cjs",
              target: "node14",
              banner: nodejs.banner
                ? {
                    js: nodejs.banner,
                  }
                : undefined,
            }),
        outfile: target,
        sourcemap: nodejs.sourcemap,
        minify: nodejs.minify,
        ...override,
      });

      cache[input.functionID] = result;
      return {
        handler,
      };
    },
  });
});
