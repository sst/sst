import path from "path";
import chalk from "chalk";
import fs from "fs-extra";
import { exec } from "child_process";
import * as esbuild from "esbuild";
import { ICommandHooks } from "aws-cdk-lib/aws-lambda-nodejs";
import { createRequire } from "module";
import { promisify } from "util";

import { Definition } from "./definition";
import { State } from "../../state/index.js";

const require = createRequire(import.meta.url);
const execAsync = promisify(exec);
const BUILD_CACHE: Record<string, esbuild.BuildResult> = {};

type Bundle = {
  loader?: { [ext: string]: esbuild.Loader };
  banner?: string;
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

type ModuleManager = {
  installer: "npm" | "yarn";
  lockFile: "package-lock.json" | "yarn.lock";
  lockFileDir: string;
};

type findUpOptions = {
  cwd: string;
}

function findUp(fileName: string, { cwd }: findUpOptions) {
  const rootPath = path.parse(process.cwd()).root;

  let directory = path.resolve(cwd);
  while (directory !== rootPath) {
    const filePath = path.resolve(directory, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    directory = path.dirname(directory);
  }
}

function getModuleManager(srcPath: string): ModuleManager {
  let foundPath;
  if (foundPath = findUp("package-lock.json", { cwd: srcPath })) {
    return {
      installer: "npm",
      lockFile: "package-lock.json",
      lockFileDir: path.dirname(foundPath)
    };
  }

  if (foundPath = findUp("yarn.lock", { cwd: srcPath })) {
    return {
      installer: "yarn",
      lockFile: "yarn.lock",
      lockFileDir: path.dirname(foundPath)
    };
  }

  throw new Error("Cannot find a lock file");
}

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
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
            bundle.banner || ""
          ].join("")
        }
      }
      : {
        target: "node14",
        format: "cjs",
        banner: bundle.banner
          ? {
            js: bundle.banner
          }
          : undefined
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
        await fs.remove(artifact);
        await fs.mkdirp(artifact);

        const result = await esbuild.build({
          ...config,
          plugins: plugins ? require(plugins) : undefined,
          sourcemap: true,
          metafile: true,
          minify: false,
          incremental: true
        });
        await fs.writeJSON(path.join(artifact, "package.json"), {
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
    bundle: async () => {
      await runBeforeBundling(opts.srcPath, artifact, bundle);
      await fs.remove(artifact);
      await fs.mkdirp(artifact);

      let result;
      try {
        await esbuild.build({
          ...config,
          plugins: plugins ? require(plugins) : undefined,
          metafile: true,
        });
      } catch (e) {
        throw new Error(
          "There was a problem transpiling the Lambda handler: " + e
        );
      }
      await fs.writeJSON(path.join(artifact, "package.json"), {
        type: bundle.format === "esm" ? "module" : "commonjs"
      });

      await runBeforeInstall(opts.srcPath, artifact, bundle);
      await installNodeModules(opts.srcPath, artifact, bundle);
      await runAfterBundling(opts.srcPath, artifact, bundle);

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
        "**/*.cjs"
      ].map(glob => path.resolve(path.join(opts.srcPath, glob))),
      ignore: []
    }
  };
};

// Do not re-install nodeModules for the same srcPath and nodeModules settings
const existingNodeModulesBySrcPathModules: Record<string, string> = {};

async function installNodeModules(
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
    await fs.copy(
      path.join(existingPath, "node_modules"),
      path.join(targetPath, "node_modules")
    );
    return;
  }

  // Find 'package.json' at handler's srcPath.
  const pkgPath = path.join(srcPath, "package.json");
  if (! await fs.pathExists(pkgPath)) {
    throw new Error(
      `Cannot find a "package.json" in the function's srcPath: ${path.resolve(
        srcPath
      )}`
    );
  }

  // Determine dependencies versions, lock file and installer
  const dependencies = await extractDependencies(pkgPath, bundle.nodeModules);
  const { installer, lockFile, lockFileDir } = getModuleManager(srcPath);

  // Create dummy package.json, copy lock file and then install
  const outputPath = path.join(targetPath, "package.json");
  await fs.ensureFile(outputPath);
  const existing = await fs.readJson(outputPath) || {};
  await fs.writeJson(outputPath, { ...existing, dependencies });
  await fs.copy(
    path.join(lockFileDir, lockFile),
    path.join(targetPath, lockFile)
  );

  // Install dependencies
  try {
    await execAsync(`${installer} install`, {
      cwd: targetPath,
    });
  } catch (e) {
    console.log(chalk.red(`There was a problem installing nodeModules.`));
    throw e;
  }

  // Store the path to the installed "node_modules"
  if (await fs.pathExists(path.join(targetPath, "node_modules"))) {
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
async function extractDependencies(
  pkgPath: string,
  modules: string[]
): Promise<{ [key: string]: string }> {
  const dependencies: { [key: string]: string } = {};

  const pkgJson = await fs.readJson(pkgPath);

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

async function runBeforeBundling(srcPath: string, buildPath: string, bundle: Bundle) {
  // Build command
  const cmds = bundle.commandHooks?.beforeBundling(srcPath, buildPath) ?? [];
  if (cmds.length === 0) {
    return;
  }

  try {
    await execAsync(cmds.join(" && "), {
      cwd: srcPath,
    });
  } catch (e) {
    console.log(
      chalk.red(`There was a problem running "beforeBundling" command.`)
    );
    throw e;
  }
}

async function runBeforeInstall(srcPath: string, buildPath: string, bundle: Bundle) {
  // Build command
  const cmds = bundle.commandHooks?.beforeInstall(srcPath, buildPath) ?? [];
  if (cmds.length === 0) {
    return;
  }

  try {
    await execAsync(cmds.join(" && "), {
      cwd: srcPath,
    });
  } catch (e) {
    console.log(
      chalk.red(`There was a problem running "beforeInstall" command.`)
    );
    throw e;
  }
}

async function runAfterBundling(srcPath: string, buildPath: string, bundle: Bundle) {
  // Build command
  const cmds = bundle.commandHooks?.afterBundling(srcPath, buildPath) ?? [];
  if (cmds.length === 0) {
    return;
  }

  try {
    await execAsync(cmds.join(" && "), {
      cwd: srcPath,
    });
  } catch (e) {
    console.log(
      chalk.red(`There was a problem running "afterBundling" command.`)
    );
    throw e;
  }
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
