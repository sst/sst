import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import zipLocal from "zip-local";
import * as esbuild from "esbuild";
import { execSync } from "child_process";
import * as lambda from "@aws-cdk/aws-lambda";
import { FunctionBundleProps } from "../Function";
import {
  addExtensionToHandler,
  getHandlerFullPosixPath,
  getHandlerHash,
} from "./builder";

// A map of supported runtimes and esbuild targets
const esbuildTargetMap = {
  [lambda.Runtime.NODEJS.toString()]: "node12",
  [lambda.Runtime.NODEJS_4_3.toString()]: "node4",
  [lambda.Runtime.NODEJS_6_10.toString()]: "node6",
  [lambda.Runtime.NODEJS_8_10.toString()]: "node8",
  [lambda.Runtime.NODEJS_10_X.toString()]: "node10",
  [lambda.Runtime.NODEJS_12_X.toString()]: "node12",
  [lambda.Runtime.NODEJS_14_X.toString()]: "node14",
};

interface BuilderProps {
  readonly srcPath: string;
  readonly handler: string;
  readonly buildDir: string;
  readonly runtime: lambda.Runtime;
  readonly bundle: boolean | FunctionBundleProps;
}

interface BuilderOutput {
  readonly outZip: lambda.Code;
  readonly outHandler: string;
}

export function getEsbuildMetafileName(handler: string): string {
  const key = handler.replace(/[/.]/g, "-");
  return `.esbuild.${key}.json`;
}

function getEsbuildExternal(
  srcPath: string,
  bundle: boolean | FunctionBundleProps
): Array<string> {
  let externals = ["aws-sdk"];

  if (bundle) {
    return [
      ...externals,
      ...((bundle as FunctionBundleProps).externalModules || []),
      ...((bundle as FunctionBundleProps).nodeModules || []),
    ];
  }

  try {
    const packageJson = fs.readJsonSync(path.join(srcPath, "package.json"));
    externals = Object.keys({
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    });
  } catch (e) {
    console.log(chalk.grey(`No package.json found in ${srcPath}`));
  }

  return externals;
}

function getEsbuildLoader(
  bundle: boolean | FunctionBundleProps
): { [ext: string]: esbuild.Loader } | undefined {
  if (bundle) {
    return (bundle as FunctionBundleProps).loader || {};
  }
  return undefined;
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

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { runtime, bundle, srcPath, handler, buildDir } = builderProps;
  const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);

  console.log(chalk.grey(`Building Lambda function ${handlerPosixPath}`));

  // Check has tsconfig
  const tsconfig = path.join(srcPath, "tsconfig.json");
  const hasTsconfig = fs.existsSync(tsconfig);

  // Check entry path exists
  let entryPath = path.join(srcPath, addExtensionToHandler(handler, ".ts"));
  if (!fs.existsSync(entryPath)) {
    entryPath = path.join(srcPath, addExtensionToHandler(handler, ".js"));
  }

  if (!fs.existsSync(entryPath)) {
    throw new Error(`Cannot find a handler file at ${entryPath}".`);
  }

  // Four cases:
  //  1. BUNDLE + srcPath ROOT
  //      src       : path/to/file.method
  //      buildPath : .build/hash-$ts
  //      zipPath   : .build/hash-$ts
  //      outZip    : .build/hash-$ts.zip
  //      outHandler: file.method
  //
  //  2. BUNDLE + srcPath NON-ROOT
  //      src       : srcPath/path/to/file.method
  //      buildPath : srcPath/.build/hash-$ts
  //      zipPath   : srcPath/.build/hash-$ts
  //      outZip    : .build/hash-$ts.zip
  //      outHandler: file.method
  //
  //  3. non-BUNDLE + srcPath ROOT
  //      src       : path/to/file.method
  //      buildPath : .build/handlerDir
  //      zipPath   : .
  //
  //     Note: This case is NOT SUPPORTED because we need to zip the app root for each
  //           handler. So after a Lambda's zip is generated, the next Lambda's zip will
  //           contain the previous Lambda's zip inside .build, and the previous Lambda's
  //           zip inside cdk.out.
  //
  //           One solution would be to cherry pick what to zip. For example, zip should
  //           only include the esbuid's output (ie. .js and .js.map files) from the
  //           .build folder.
  //
  //           Also need to clear all .build folders generated from Lambda functions that
  //           has srcPath.
  //
  //  4. non-BUNDLE + srcPath NON-ROOT
  //      src       : srcPath/path/to/file.method
  //      buildPath : srcPath/.build/hash-$ts
  //      zipPath   : srcPath
  //      outZip    : .build/hash-$ts.zip
  //      outHandler: .build/hash-$ts/file.method
  //
  //     Note: place outZip at the app root's .build because entire srcPath is zipped up.
  //           If outZip is srcPath's .build, a Lambda's zip would include zip files from
  //           all the previous Lambdas.

  const appPath = process.cwd();
  const handlerHash = getHandlerHash(handlerPosixPath);
  const buildPath = path.join(srcPath, buildDir, handlerHash);
  const metafile = path.join(
    srcPath,
    buildDir,
    getEsbuildMetafileName(handler)
  );

  // Transpile
  transpile(entryPath);

  // Package nodeModules
  installNodeModules(srcPath, bundle);

  // Copy files
  copyFiles(bundle);

  // Zip
  let outZip, outHandler;
  if (bundle) {
    outZip = path.join(appPath, buildDir, `${handlerHash}.zip`);
    outHandler = path.basename(handler);
    zip(buildPath, outZip);
  } else {
    outZip = path.join(appPath, buildDir, `${handlerHash}.zip`);
    outHandler = `${buildDir}/${handlerHash}/${path.basename(handler)}`;
    zip(srcPath, outZip);
  }

  return {
    outZip: lambda.Code.fromAsset(outZip),
    outHandler,
  };

  ///////////////
  // Functions //
  ///////////////

  function transpile(entryPath: string) {
    esbuild.buildSync({
      external: getEsbuildExternal(srcPath, bundle),
      loader: getEsbuildLoader(bundle),
      metafile,
      bundle: true,
      format: "cjs",
      sourcemap: true,
      platform: "node",
      target: [esbuildTargetMap[runtime.toString()] || "node12"],
      outdir: buildPath,
      entryPoints: [entryPath],
      color: process.env.NO_COLOR !== "true",
      tsconfig: hasTsconfig ? tsconfig : undefined,
      logLevel: process.env.DEBUG ? "warning" : "error",
    });
  }

  function installNodeModules(
    srcPath: string,
    bundle: boolean | FunctionBundleProps
  ) {
    // Validate 'nodeModules' is defined in bundle options
    bundle = bundle as FunctionBundleProps;
    if (!bundle || !bundle.nodeModules || bundle.nodeModules.length === 0) {
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
    const outputPath = path.join(buildPath, "package.json");
    fs.ensureFileSync(outputPath);
    fs.writeJsonSync(outputPath, { dependencies });
    if (lockFile) {
      fs.copySync(path.join(srcPath, lockFile), path.join(buildPath, lockFile));
    }

    try {
      execSync(`${installer} install`, {
        cwd: buildPath,
        stdio: "pipe",
      });
    } catch (e) {
      console.log(e.stdout.toString());
      console.log(e.stderr.toString());
      throw new Error("There was a problem installing nodeModules.");
    }
  }

  function copyFiles(bundle: boolean | FunctionBundleProps) {
    // Validate 'copyFiles' is defined in bundle options
    bundle = bundle as FunctionBundleProps;
    if (!bundle || !bundle.copyFiles || bundle.copyFiles.length === 0) {
      return;
    }

    bundle.copyFiles.forEach(({ from, to }) => {
      const fromPath = path.join(srcPath, from);
      const toPath = path.join(buildPath, to);
      fs.copySync(fromPath, toPath);
    });
  }

  function zip(dir: string, zipFile: string) {
    try {
      zipLocal.sync.zip(dir).compress().save(zipFile);
    } catch (e) {
      console.log(e);
      throw new Error("There was a problem generating Lambda package.");
    }

    return zipFile;
  }
}
