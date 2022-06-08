import path from "path";
import chalk from "chalk";
import { Definition } from "./definition";
import fs from "fs-extra";
import { State } from "../../state/index.js";
import { execSync } from "child_process";
import spawn from "cross-spawn";
import * as esbuild from "esbuild";
import { ICommandHooks } from "aws-cdk-lib/aws-lambda-nodejs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const BUILD_CACHE: Record<string, esbuild.BuildResult> = {};

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
  sourcemap?: boolean;
  format?: "esm" | "cjs";
};

export const NodeHandler: Definition<Bundle> = opts => {
  const dir = path.dirname(opts.handler);
  const ext = path.extname(opts.handler);
  const base = path.basename(opts.handler).split(".")[0];
  const file = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]
    .map(ext => path.join(dir, base + ext))
    .find(file => {
      const p = path.join(opts.srcPath, file);
      return fs.existsSync(p);
    })!;
  if (!file)
    throw new Error(`Cannot find a handler file for "${opts.handler}"`);

  const artifact = State.Function.artifactsPath(opts.root, opts.id);
  const bundle = opts.bundle || {
    minify: true
  };
  // If srcPath is an absolute path, we need to convert it to an relative path
  // and append it to the artifact path.
  // Note: absolute "srcPath" should only be used for RDS's internal
  //       migrator function. User provided "srcPath" should always be
  //       relative path.
  const target = path.join(
    artifact,
    path
      .relative(opts.root, path.resolve(opts.srcPath))
      .split(path.sep)
      .filter(x => x !== "node_modules")
      .join(path.sep),
    path.dirname(file),
    base + ".js"
  );
  const config: esbuild.BuildOptions = {
    loader: bundle.loader,
    minify: bundle.minify,
    sourcemap: bundle.sourcemap || false,
    define: bundle.esbuildConfig?.define,
    keepNames: bundle.esbuildConfig?.keepNames,
    entryPoints: [path.join(opts.srcPath, file)],
    bundle: opts.bundle !== false,
    external:
      opts.bundle === false
        ? []
        : [
            ...(bundle.format === "esm" ? [] : ["aws-sdk"]),
            ...(bundle.externalModules || []),
            ...(bundle.nodeModules || [])
          ],
    mainFields:
      bundle.format === "esm" ? ["module", "main"] : ["main", "module"],
    platform: "node",
    ...(bundle.format === "esm"
      ? {
          target: "esnext",
          format: "esm",
          banner: {
            js: [
              `import { createRequire as topLevelCreateRequire } from 'module'`,
              `const require = topLevelCreateRequire(import.meta.url)`
            ].join("\n")
          }
        }
      : {
          target: "node14",
          format: "cjs"
        }),
    outfile: target
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
        .map(x =>
          path
            .relative(process.cwd(), x)
            .split(path.sep)
            .join(path.posix.sep)
        )
        .some(x => existing.metafile!.inputs[x]);
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
          sourcemap: true,
          metafile: true,
          minify: false,
          incremental: true
        });
        fs.writeJSONSync(path.join(artifact, "package.json"), {
          type: bundle.format === "esm" ? "module" : "commonjs"
        });
        BUILD_CACHE[opts.id] = result;
        return [];
      } catch (e) {
        return (e as esbuild.BuildResult).errors.map(e => ({
          location: {
            file: e.location?.file || path.join(opts.srcPath, file),
            column: e.location?.column,
            line: e.location?.line,
            length: e.location?.length
          },
          message: e.text
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
            plugins
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
        type: bundle.format === "esm" ? "module" : "commonjs"
      });
      const result = spawn.sync("node", [builder], {
        stdio: "pipe"
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

      const handler = path
        .join(
          path
            .relative(opts.root, path.resolve(opts.srcPath))
            .split(path.sep)
            .filter(x => x !== "node_modules")
            .join(path.sep),
          opts.handler
        )
        .replace(/\\/g, "/");
      return {
        directory: artifact,
        handler
      };
    },
    run: {
      command: process.execPath,
      args: [getAwsLambdaRicBinPath(), target.replace(".js", ext)],
      env: {
        // NODE_OPTIONS: "--enable-source-maps",
        AWS_LAMBDA_NODEJS_USE_ALTERNATIVE_CLIENT_1: "true"
      }
    },
    watcher: {
      include: [
        "**/*.ts",
        "**/*.tsx",
        "**/*.mts",
        "**/*.cts",
        "**/*.js",
        "**/*.jsx",
        "**/*.mjs",
        "**/*.cjs",
      ].map((glob) =>
        path.resolve(path.join(opts.srcPath, glob))
      ),
      ignore: []
    }
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
      stdio: "pipe"
    });
  } catch (e) {
    console.log(chalk.red(`There was a problem installing nodeModules.`));
    throw e;
  }

  // Store the path to the installed "node_modules"
  if (fs.existsSync(path.join(targetPath, "node_modules"))) {
    existingNodeModulesBySrcPathModules[srcPathModules] = path.resolve(
      targetPath
    );
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
    ...(pkgJson.peerDependencies ?? {})
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
      stdio: "pipe"
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
      stdio: "pipe"
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
      stdio: "pipe"
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

function getAwsLambdaRicBinPath(): string {
  const pkg = "@serverless-stack/aws-lambda-ric";
  const filePath = require.resolve(`${pkg}/package.json`);
  if (!filePath) {
    throw new Error(`There was a problem finding ${pkg}`);
  }

  const binPath = path.join(filePath, "../bin/index.js");
  if (!fs.existsSync(binPath)) {
    throw new Error(
      `There was a problem finding the ${pkg}/bin/index entry point`
    );
  }

  return binPath;
}
