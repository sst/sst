import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import zipLocal from "zip-local";
import * as esbuild from "esbuild";
import type { Include } from "../Function";

interface BuilderProps {
  readonly target: string;
  readonly srcPath: string;
  readonly handler: string;
  readonly bundle: boolean;
  readonly buildDir: string;
  readonly include: Include[];
}

interface BuilderOutput {
  readonly outZip: string;
  readonly outHandler: string;
}

function addExtensionToHandler(handler: string, extension: string): string {
  return handler.replace(/\.[\w\d]+$/, extension);
}

export function getEsbuildMetafileName(handler: string): string {
  const key = handler.replace(/[/.]/g, "-");
  return `.esbuild.${key}.json`;
}

function getAllExternalsForHandler(
  srcPath: string,
  bundle: boolean
): Array<string> {
  let externals = ["aws-sdk"];

  if (bundle) {
    return externals;
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

function getHandlerFullPosixPath(srcPath: string, handler: string): string {
  return srcPath === "." ? handler : `${srcPath}/${handler}`;
}

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { target, bundle, srcPath, handler, buildDir, include } = builderProps;

  console.log(
    chalk.grey(
      `Building Lambda function ${getHandlerFullPosixPath(srcPath, handler)}`
    )
  );

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
  const handlerHash = `${getHandlerFullPosixPath(srcPath, handler).replace(
    /[/.]/g,
    "-"
  )}-${Date.now()}`;
  const buildPath = path.join(srcPath, buildDir, handlerHash);
  const metafile = path.join(
    srcPath,
    buildDir,
    getEsbuildMetafileName(handler)
  );
  const external = getAllExternalsForHandler(srcPath, bundle);

  transpile(entryPath);

  for (const i of include) {
    fs.copySync(i.from, path.join(buildPath, i.to), {
      recursive: true,
    });
  }

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

  return { outZip, outHandler };

  function transpile(entryPath: string) {
    esbuild.buildSync({
      external,
      metafile,
      bundle: true,
      format: "cjs",
      sourcemap: true,
      platform: "node",
      target: [target],
      outdir: buildPath,
      entryPoints: [entryPath],
      color: process.env.NO_COLOR !== "true",
      tsconfig: hasTsconfig ? tsconfig : undefined,
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
