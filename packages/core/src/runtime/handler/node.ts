import path from "path";
import chalk from "chalk";
import { Definition, Issue } from "./definition";
import fs from "fs-extra";
import { State } from "../../state";
import { ChildProcess, execSync } from "child_process";
import spawn from "cross-spawn";
import * as esbuild from "esbuild";
import { ICommandHooks } from "aws-cdk-lib/aws-lambda-nodejs";
import DataLoader from "dataloader";

const BUILD_CACHE: Record<string, esbuild.BuildResult> = {};

const TSC_CACHE: Record<string, ChildProcess> = {};
const LINT_CACHE: Record<string, ChildProcess> = {};

// If multiple functions are effected by a change only run tsc once per srcPath
// TODO: Use the compiler API - this is way too slow
const TYPESCRIPT_LOADER = new DataLoader<string, Issue[]>(
  async (paths) => {
    const proms = paths.map((srcPath) => {
      const cmd = {
        command: "npx",
        args: ["tsc", "--noEmit"],
      };
      const existing = TSC_CACHE[srcPath];
      if (existing) existing.kill();
      const proc = spawn(cmd.command, cmd.args, {
        env: {
          ...process.env,
        },
        stdio: "pipe",
        cwd: srcPath,
      });
      let collect = "";
      proc.stderr?.on("data", (data) => (collect += data));
      proc.stdout?.on("data", (data) => (collect += data));
      TSC_CACHE[srcPath] = proc;
      return new Promise<Issue[]>((resolve) => {
        proc.on("exit", () => {
          const errs = collect.trim();
          if (!errs) {
            resolve([]);
            return;
          }
          resolve([
            {
              location: {
                file: srcPath,
              },
              message: errs,
            },
          ]);
        });
      });
    });
    return Promise.all(proms);
  },
  {
    cache: false,
  }
);

type Bundle = {
  loader?: { [ext: string]: esbuild.Loader };
  externalModules?: string[];
  nodeModules?: string[];
  esbuildConfig?: {
    define?: { [key: string]: string };
    keepNames?: boolean;
    plugins?: string;
  };
  commandHooks?: ICommandHooks;
  minify?: boolean;
  format?: "esm" | "cjs";
};

export const NodeHandler: Definition<Bundle> = (opts) => {
  const dir = path.dirname(opts.handler);
  const ext = path.extname(opts.handler);
  const base = path.basename(opts.handler).split(".")[0];
  const file = [".ts", ".tsx", ".js", ".jsx"]
    .map((ext) => path.join(dir, base + ext))
    .find((file) => {
      const p = path.join(opts.srcPath, file);
      return fs.existsSync(p);
    })!;
  if (!file)
    throw new Error(`Cannot find a handler file for "${opts.handler}"`);

  const artifact = State.Function.artifactsPath(opts.root, opts.id);
  const bundle = opts.bundle || {
    minify: true,
  };
  // If srcPath is an absolute path, we need to convert it to an relative path
  // and append it to the artifact path.
  // Note: absolute "srcPath" should only be used for RDS's internal
  //       migrator function. User provided "srcPath" should always be
  //       relative path.
  const target = path.join(
    artifact,
    absolutePathToRelativePath(opts.srcPath),
    path.dirname(file),
    base + ".js"
  );
  const config: esbuild.BuildOptions = {
    loader: bundle.loader,
    minify: bundle.minify,
    define: bundle.esbuildConfig?.define,
    keepNames: bundle.esbuildConfig?.keepNames,
    entryPoints: [path.join(opts.srcPath, file)],
    bundle: opts.bundle !== false,
    external: [
      "aws-sdk",
      ...(bundle.externalModules || []),
      ...(bundle.nodeModules || []),
    ],
    sourcemap: true,
    platform: "node",
    ...(bundle.format === "esm"
      ? {
          target: "esnext",
          format: "esm",
          banner: {
            js: [
              `import { createRequire as topLevelCreateRequire } from 'module'`,
              `const require = topLevelCreateRequire(import.meta.url)`,
            ].join("\n"),
          },
        }
      : {
          target: "node14",
          format: "cjs",
        }),
    outfile: target,
  };

  const plugins = bundle.esbuildConfig?.plugins
    ? path.join(opts.root, bundle.esbuildConfig.plugins)
    : undefined;
  if (plugins && !fs.existsSync(plugins)) {
    throw new Error(
      `Cannot find an esbuild plugins file at: ${path.resolve(plugins)}`
    );
  }

  return {
    shouldBuild: (files: string[]) => {
      const existing = BUILD_CACHE[opts.id];
      if (!existing) return true;
      const result = files
        .map((x) =>
          path.relative(process.cwd(), x).split(path.sep).join(path.posix.sep)
        )
        .some((x) => existing.metafile!.inputs[x]);
      return result;
    },
    build: async () => {
      const existing = BUILD_CACHE[opts.id];

      try {
        if (existing?.rebuild) {
          const result = await existing.rebuild();
          BUILD_CACHE[opts.id] = result;
          return [];
        }
        fs.removeSync(artifact);
        fs.mkdirpSync(artifact);

        const result = await esbuild.build({
          ...config,
          plugins: plugins ? require(plugins) : undefined,
          metafile: true,
          minify: false,
          incremental: true,
        });
        fs.writeJSONSync(path.join(artifact, "package.json"), {
          type: bundle.format === "esm" ? "module" : "commonjs",
        });
        BUILD_CACHE[opts.id] = result;
        return [];
      } catch (e: any) {
        return (e as esbuild.BuildResult).errors.map((e) => ({
          location: {
            file: e.location?.file || path.join(opts.srcPath, file),
            column: e.location?.column,
            line: e.location?.line,
            length: e.location?.length,
          },
          message: e.text,
        }));
      }
    },
    bundle: () => {
      runBeforeBundling(opts.srcPath, artifact, bundle);

      // We cannot use esbuild.buildSync(config) because it doesn't support plugins;
      const script = `
        const esbuild = require("esbuild")
        async function run() {
          const config = ${JSON.stringify({
            ...config,
            metafile: true,
            plugins,
          })}
          try {
            await esbuild.build({
              ...config,
              plugins: config.plugins ? require(config.plugins) : undefined
            })
            process.exit(0)
          } catch {
            process.exit(1)
          }
        }
        run()
      `;
      fs.removeSync(artifact);
      fs.mkdirpSync(artifact);
      const builder = path.join(artifact, "builder.cjs");
      fs.writeFileSync(builder, script);
      fs.writeJSONSync(path.join(artifact, "package.json"), {
        type: bundle.format === "esm" ? "module" : "commonjs",
      });
      const result = spawn.sync("node", [builder], {
        stdio: "pipe",
      });
      if (result.status !== 0) {
        const err = (
          result.stderr.toString() + result.stdout.toString()
        ).trim();
        throw new Error(
          "There was a problem transpiling the Lambda handler: " + err
        );
      }

      fs.removeSync(builder);

      runBeforeInstall(opts.srcPath, artifact, bundle);

      installNodeModules(opts.srcPath, artifact, bundle);

      runAfterBundling(opts.srcPath, artifact, bundle);

      // If handler is an absolute path, we need to convert it to an relative
      // path. This is because the Lambda's handler path always needs to be
      // an relative path.
      // Note: absolute "srcPath" should only be used for RDS's internal
      //       migrator function. User provided "srcPath" should always be
      //       relative path.
      const handler = path.join(opts.srcPath, opts.handler).replace(/\\/g, "/");
      return {
        directory: artifact,
        handler: absolutePathToRelativePath(handler),
      };
    },
    run: {
      command: "npx",
      args: ["aws-lambda-ric", target.replace(".js", ext)],
      env: {
        // NODE_OPTIONS: "--enable-source-maps",
        AWS_LAMBDA_NODEJS_USE_ALTERNATIVE_CLIENT_1: "true",
      },
    },
    watcher: {
      include: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"].map((glob) =>
        path.resolve(path.join(opts.srcPath, glob))
      ),
      ignore: [],
    },
    checks: {
      type: () => {
        return TYPESCRIPT_LOADER.load(opts.srcPath);
      },
      lint: async () => {
        const existing = LINT_CACHE[opts.srcPath];
        if (existing) existing.kill();
        const cmd = {
          command: "npx",
          args: ["eslint", file],
        };
        const proc = spawn(cmd.command, cmd.args, {
          env: {
            ...process.env,
          },
          stdio: "inherit",
          cwd: opts.srcPath,
        });
        LINT_CACHE[opts.srcPath] = proc;
        return [];
      },
    },
  };
};

// Do not re-install nodeModules for the same srcPath and nodeModules settings
const existingNodeModulesBySrcPathModules: Record<string, string> = {};

function installNodeModules(
  srcPath: string,
  targetPath: string,
  bundle: Bundle
) {
  if (!bundle.nodeModules) return;
  // If nodeModules have been installed for the same srcPath, copy the
  // "node_modules" folder over. Do not re-install.
  const modulesStr = JSON.stringify(bundle.nodeModules.slice().sort());
  const srcPathModules = `${srcPath}/${modulesStr}`;
  const existingPath = existingNodeModulesBySrcPathModules[srcPathModules];
  if (existingPath) {
    fs.copySync(
      path.join(existingPath, "node_modules"),
      path.join(targetPath, "node_modules")
    );
    return;
  }

  // Find 'package.json' at handler's srcPath.
  const pkgPath = path.join(srcPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      `Cannot find a "package.json" in the function's srcPath: ${path.resolve(
        srcPath
      )}`
    );
  }

  // Determine dependencies versions, lock file and installer
  const dependencies = extractDependencies(pkgPath, bundle.nodeModules);
  let installer = "npm";
  let lockFile;
  if (fs.existsSync(path.join(srcPath, "package-lock.json"))) {
    installer = "npm";
    lockFile = "package-lock.json";
  } else if (fs.existsSync(path.join(srcPath, "yarn.lock"))) {
    installer = "yarn";
    lockFile = "yarn.lock";
  }

  // Create dummy package.json, copy lock file if any and then install
  const outputPath = path.join(targetPath, "package.json");
  fs.ensureFileSync(outputPath);
  const existing = fs.readJsonSync(outputPath) || {};
  fs.writeJsonSync(outputPath, { ...existing, dependencies });
  if (lockFile) {
    fs.copySync(path.join(srcPath, lockFile), path.join(targetPath, lockFile));
  }

  // Install dependencies
  try {
    execSync(`${installer} install`, {
      cwd: targetPath,
      stdio: "pipe",
    });
  } catch (e) {
    console.log(chalk.red(`There was a problem installing nodeModules.`));
    throw e;
  }

  // Store the path to the installed "node_modules"
  if (fs.existsSync(path.join(targetPath, "node_modules"))) {
    existingNodeModulesBySrcPathModules[srcPathModules] =
      path.resolve(targetPath);
  }
}

/**
 * Extract versions for a list of modules.
 *
 * First lookup the version in the package.json and then fallback to requiring
 * the module's package.json. The fallback is needed for transitive dependencies.
 */
function extractDependencies(
  pkgPath: string,
  modules: string[]
): { [key: string]: string } {
  const dependencies: { [key: string]: string } = {};

  const pkgJson = fs.readJsonSync(pkgPath);

  const pkgDependencies = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
  };

  for (const mod of modules) {
    try {
      const version =
        pkgDependencies[mod] ?? require(`${mod}/package.json`).version; // eslint-disable-line @typescript-eslint/no-var-requires
      dependencies[mod] = version;
    } catch (err) {
      throw new Error(
        `Cannot extract version for module '${mod}'. Check that it's referenced in your package.json or installed.`
      );
    }
  }

  return dependencies;
}

function runBeforeBundling(srcPath: string, buildPath: string, bundle: Bundle) {
  // Build command
  const cmds = bundle.commandHooks?.beforeBundling(srcPath, buildPath) ?? [];
  if (cmds.length === 0) {
    return;
  }

  try {
    execSync(cmds.join(" && "), {
      cwd: srcPath,
      stdio: "pipe",
    });
  } catch (e) {
    console.log(
      chalk.red(`There was a problem running "beforeBundling" command.`)
    );
    throw e;
  }
}

function runBeforeInstall(srcPath: string, buildPath: string, bundle: Bundle) {
  // Build command
  const cmds = bundle.commandHooks?.beforeInstall(srcPath, buildPath) ?? [];
  if (cmds.length === 0) {
    return;
  }

  try {
    execSync(cmds.join(" && "), {
      cwd: srcPath,
      stdio: "pipe",
    });
  } catch (e) {
    console.log(
      chalk.red(`There was a problem running "beforeInstall" command.`)
    );
    throw e;
  }
}

function runAfterBundling(srcPath: string, buildPath: string, bundle: Bundle) {
  // Build command
  const cmds = bundle.commandHooks?.afterBundling(srcPath, buildPath) ?? [];
  if (cmds.length === 0) {
    return;
  }

  try {
    execSync(cmds.join(" && "), {
      cwd: srcPath,
      stdio: "pipe",
    });
  } catch (e) {
    console.log(
      chalk.red(`There was a problem running "afterBundling" command.`)
    );
    throw e;
  }
}

function absolutePathToRelativePath(absolutePath: string): string {
  if (!path.isAbsolute(absolutePath)) {
    return absolutePath;
  }

  // For win32: root for D:\\path\\to\\dir is D:\\
  // For posix: root for /path/to/dir is /
  const { root } = path.parse(absolutePath);
  return absolutePath.substring(root.length);
}
