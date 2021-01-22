import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import zipLocal from "zip-local";
import * as esbuild from "esbuild";

interface BuilderProps {
  readonly srcPath: string;
  readonly handler: string;
  readonly bundle: boolean;
  readonly buildDir: string;
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

function getHandlerCopy(srcPath: string, handler: string): string {
  return srcPath === "." ? handler : `${srcPath}/${handler}`;
}

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { srcPath, bundle, handler, buildDir } = builderProps;

  console.log(
    chalk.grey(`Building Lambda function ${getHandlerCopy(srcPath, handler)}`)
  );

  const appPath = process.cwd();

  const external = getAllExternalsForHandler(srcPath, bundle);

  // Check has tsconfig
  const tsconfig = path.join(srcPath, "tsconfig.json");
  const hasTsconfig = fs.existsSync(tsconfig);

  const buildPath = path.join(srcPath, buildDir);
  const metafile = path.join(buildPath, getEsbuildMetafileName(handler));

  // Check entry path exists
  let entryPath = path.join(srcPath, addExtensionToHandler(handler, ".ts"));
  if (!fs.existsSync(entryPath)) {
    entryPath = path.join(srcPath, addExtensionToHandler(handler, ".js"));
  }

  if (!fs.existsSync(entryPath)) {
    throw new Error(`Cannot find a handler file at ${entryPath}".`);
  }

  function transpile(entryPath: string) {
    esbuild.buildSync({
      external,
      metafile,
      bundle: true,
      format: "cjs",
      sourcemap: true,
      platform: "node",
      outdir: buildPath,
      entryPoints: [entryPath],
      color: process.env.NO_COLOR !== "true",
      tsconfig: hasTsconfig ? tsconfig : undefined,
    });
  }

  function zip(dir: string) {
    const zipFile = path.join(
      appPath,
      buildDir,
      `${handler.replace(/[./]/g, "-")}.zip`
    );

    try {
      zipLocal.sync.zip(dir).compress().save(zipFile);
    } catch (e) {
      console.log(e);
      throw new Error("There was a problem generating Lambda package.");
    }

    return zipFile;
  }

  transpile(entryPath);

  let outZip, outHandler;
  if (bundle) {
    outZip = zip(path.join(srcPath, buildDir));
    outHandler = handler;
  } else {
    outZip = zip(srcPath);
    outHandler = `${buildDir}/${handler}`;
  }

  return { outZip, outHandler };
}
