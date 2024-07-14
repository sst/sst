import os from "os";
import path from "path";
import fs from "fs/promises";
import { exec } from "child_process";
import fsSync from "fs";
import { useProject } from "../../project.js";
import esbuild, { BuildOptions, BuildResult } from "esbuild";
import url from "url";
import { Worker } from "worker_threads";
import { RuntimeHandler } from "../handlers.js";
import { useRuntimeWorkers } from "../workers.js";
import { Colors } from "../../cli/colors.js";
import { Logger } from "../../logger.js";
import { findAbove, findBelow } from "../../util/fs.js";
import { lazy } from "../../util/lazy.js";

export const useNodeHandler = (): RuntimeHandler => {
  const rebuildCache: Record<
    string,
    {
      result: esbuild.BuildResult;
      ctx: esbuild.BuildContext;
    }
  > = {};
  process.on("exit", () => {
    for (const { ctx } of Object.values(rebuildCache)) {
      ctx.dispose();
    }
  });
  const project = useProject();
  const threads = new Map<string, Worker>();

  return {
    shouldBuild: (input) => {
      const cache = rebuildCache[input.functionID];
      if (!cache) return false;
      const relative = path
        .relative(project.paths.root, input.file)
        .split(path.sep)
        .join(path.posix.sep);
      return Boolean(cache.result.metafile?.inputs[relative]);
    },
    canHandle: (input) => input.startsWith("nodejs"),
    startWorker: async (input) => {
      const workers = await useRuntimeWorkers();
      new Promise(async () => {
        const worker = new Worker(
          url.fileURLToPath(
            new URL("../../support/nodejs-runtime/index.mjs", import.meta.url)
          ),
          {
            env: {
              ...input.environment,
              IS_LOCAL: "true",
            },
            execArgv: ["--enable-source-maps"],
            workerData: input,
            stderr: true,
            stdin: true,
            stdout: true,
          }
        );
        worker.stdout.on("data", (data: Buffer) => {
          workers.stdout(input.workerID, data.toString());
        });
        worker.stderr.on("data", (data: Buffer) => {
          workers.stdout(input.workerID, data.toString());
        });
        worker.on("exit", () => workers.exited(input.workerID));
        threads.set(input.workerID, worker);
      });
    },
    stopWorker: async (workerID) => {
      const worker = threads.get(workerID);
      await worker?.terminate();
    },
    build: async (input) => {
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
          return fsSync.existsSync(file);
        })!;
      if (!file)
        return {
          type: "error",
          errors: [`Could not find file for handler "${input.props.handler}"`],
        };

      const nodejs = input.props.nodejs || {};
      const isESM = (nodejs.format || "esm") === "esm";

      const relative = path.relative(
        project.paths.root,
        path.resolve(parsed.dir)
      );

      const extension = isESM ? ".mjs" : ".cjs";
      const target = path.join(
        input.out,
        !relative.startsWith("..") && !path.isAbsolute(input.props.handler!)
          ? relative
          : "",
        // Lambda handler can only contain 1 dot separating the file name and function name
        parsed.name.replace(".", "-") + extension
      );
      const handler = path
        .relative(input.out, target.replace(extension, parsed.ext))
        .split(path.sep)
        .join(path.posix.sep);

      if (input.mode === "start") {
        const root = await findAbove(parsed.dir, "package.json");
        if (!root) {
          return {
            type: "error",
            errors: [
              `Could not find package.json for handler "${input.props.handler}"`,
            ],
          };
        }
        const dir = path.join(root, "node_modules");
        try {
          await fs.symlink(
            path.resolve(dir),
            path.resolve(path.join(input.out, "node_modules")),
            "dir"
          );
        } catch {}
      }

      // Rebuilt using existing esbuild context
      let ctx = rebuildCache[input.functionID]?.ctx;
      const forceExternal = [
        "sharp",
        "pg-native",
        ...(isESM || input.props.runtime !== "nodejs16.x" ? [] : ["aws-sdk"]),
      ];
      const { external, ...override } = nodejs.esbuild || {};
      if (!ctx) {
        const options: BuildOptions = {
          entryPoints: [file],
          platform: "node",
          external: [
            ...forceExternal,
            ...(nodejs.install || []),
            ...(external || []),
          ],
          loader: nodejs.loader,
          keepNames: true,
          bundle: true,
          logLevel: "silent",
          splitting: nodejs.splitting,
          metafile: true,
          outExtension: nodejs.splitting ? { ".js": ".mjs" } : undefined,
          ...(isESM
            ? {
                format: "esm",
                target: "esnext",
                mainFields: ["module", "main"],
                banner: {
                  js: [
                    `import { createRequire as topLevelCreateRequire } from 'module';`,
                    `const require = topLevelCreateRequire(import.meta.url);`,
                    `import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
                    `const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
                    nodejs.banner || "",
                  ].join("\n"),
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
          outfile: !nodejs.splitting ? target : undefined,
          outdir: nodejs.splitting ? path.dirname(target) : undefined,
          // always generate sourcemaps in local
          // never generate sourcemaps if explicitly false
          // otherwise generate sourcemaps
          sourcemap:
            input.mode === "start"
              ? "linked"
              : nodejs.sourcemap === false
              ? false
              : true,
          minify: nodejs.minify,
          ...override,
        };
        ctx = await esbuild.context(options);
      }

      try {
        const result = await ctx.rebuild();

        // Install node_modules
        const installPackages = [
          ...(nodejs.install || []),
          ...forceExternal
            .filter((pkg) => pkg !== "aws-sdk")
            .filter((pkg) => !external?.includes(pkg))
            .filter((pkg) =>
              Object.values(result.metafile?.inputs || {}).some(({ imports }) =>
                imports.some(({ path }) => path === pkg)
              )
            ),
        ];

        // TODO bubble up the warnings
        const warnings: string[] = [];
        Object.entries(result.metafile?.inputs || {}).forEach(
          ([inputPath, { imports }]) =>
            imports
              .filter(({ path }) => path.includes("sst/constructs"))
              .forEach(({ path }) => {
                warnings.push(
                  `You are importing from "${path}" in "${inputPath}". Did you mean to import from "sst/node"?`
                );
              })
        );

        if (input.mode === "deploy" && installPackages) {
          const src = await findAbove(parsed.dir, "package.json");
          if (!src) {
            return {
              type: "error",
              errors: [
                `Could not find package.json for handler "${input.props.handler}"`,
              ],
            };
          }
          const json = JSON.parse(
            await fs
              .readFile(path.join(src, "package.json"))
              .then((x) => x.toString())
          );
          await fs.writeFile(
            path.join(input.out, "package.json"),
            JSON.stringify({
              dependencies: Object.fromEntries(
                installPackages.map((x) => [x, json.dependencies?.[x] || "*"])
              ),
            })
          );
          const cmd = [
            "npm install",
            "--omit=dev",
            "--no-optional",
            "--force",
            "--platform=linux",
            input.props.architecture === "arm_64"
              ? "--arch=arm64"
              : "--arch=x64",
            // support npm versions 10 and above
            "--os=linux",
            input.props.architecture === "arm_64" ? "--cpu=arm64" : "--cpu=x64",
          ];

          if (installPackages.includes("sharp")) {
            /**
             * TODO: This is a workaround for issues that sharp v0.33.0 has
             * with cross platform builds. This can be removed once sharp
             * releases a new version with the fix.
             */
            cmd.push("--force sharp@0.32.6");
            /**
             * Once the above issue is resolved, the code below can be used.
             */
            // cmd.push(
            //   ...input.props.architecture === "arm_64"
            //     ? ["--arch=arm64", "--force @img/sharp-linux-arm64"]
            //     : ["--arch=x64", "--force @img/sharp-linux-x64"],
            // );
          }
          await new Promise<void>((resolve, reject) => {
            exec(cmd.join(" "), { cwd: input.out }, (error) => {
              if (error) {
                reject(error);
              }
              resolve();
            });
          });
        }

        // Cache esbuild result and context for rebuild
        if (input.mode === "start") {
          rebuildCache[input.functionID] = { ctx, result };
        }

        if (input.mode === "deploy") {
          ctx.dispose();
        }

        logMemoryUsage(input.functionID, input.props.handler!);

        return {
          type: "success",
          handler,
          sourcemap: !nodejs.sourcemap
            ? Object.keys(result.metafile?.outputs || {}).find((item) =>
                item.endsWith(".map")
              )
            : undefined,
        };
      } catch (ex: any) {
        const result = ex as BuildResult;
        if ("errors" in result) {
          return {
            type: "error",
            errors: result.errors.flatMap((x) => [
              Colors.bold(x.text),
              x.location?.file || "",
              Colors.dim(x.location?.line, "│", x.location?.lineText),
            ]),
          };
        }

        return {
          type: "error",
          errors: [ex.toString()],
        };
      }
    },
  };
};

function logMemoryUsage(functionID: string, handler: string) {
  const printInMB = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;
  const used = process.memoryUsage();
  for (const key in used) {
    // @ts-ignore
    used[key] = printInMB(used[key]);
  }
  Logger.debug({
    functionID,
    handler,
    freeMemory: printInMB(os.freemem()),
    totalMemory: printInMB(os.totalmem()),
    ...used,
  });
}
