import chalk from "chalk";
//import crossZip from "cross-zip";
import zipLocal from "zip-local";
import * as path from "path";
import * as fs from "fs-extra";
import * as esbuild from "esbuild";

interface BuilderProps {
  readonly entry: string;
  readonly srcPath: string;
  readonly handler: string;
  readonly bundle: boolean;
  readonly buildDir: string;
}

interface BuilderOutput {
  readonly outZip: string;
  readonly outHandler: string;
}

function getHandlerString(entry: string, handler: string): string {
  const parts = entry.split("/");
  return parts[parts.length - 1].replace(/\.[\w\d]+$/, `.${handler}`);
}

export function getEsbuildMetafileName(entry: string, handler: string): string {
  const key = `${entry}/${handler}`.replace(/[/.]/g, "-");

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

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { entry, srcPath, bundle, handler, buildDir } = builderProps;

  console.log(
    chalk.grey(`Building Lambda function ${srcPath}/${entry}:${handler}`)
  );

  const appPath = process.cwd();

  const external = getAllExternalsForHandler(srcPath, bundle);

  const tsconfig = path.join(srcPath, "tsconfig.json");
  const hasTsconfig = fs.existsSync(tsconfig);

  const buildPath = path.join(srcPath, buildDir);
  const metafile = path.join(buildPath, getEsbuildMetafileName(entry, handler));

  const entryPath = path.join(srcPath, entry);

  function transpile(entryPath: string) {
    if (!fs.existsSync(entryPath)) {
      throw new Error(`Cannot find a handler file at ${entryPath}".`);
    }

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
      `${entry.replace(/[./]/g, "-")}-${handler}.zip`
    );

    try {
      zipLocal.sync.zip(dir).compress().save(zipFile);
      //crossZip.zipSync(dir, zipFile);
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
    outHandler = getHandlerString(entry, handler);
  } else {
    outZip = zip(srcPath);
    outHandler = `${buildDir}/${getHandlerString(entry, handler)}`;
  }

  return { outZip, outHandler };
}
