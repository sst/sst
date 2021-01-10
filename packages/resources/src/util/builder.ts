import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as esbuild from "esbuild";
import { execSync } from "child_process";

interface BuilderProps {
  readonly entry: string;
  readonly srcPath: string;
  readonly handler: string;
  readonly bundle: boolean;
  readonly buildDir: string;
}

interface BuilderOutput {
  readonly outDir: string;
  readonly outHandler: string;
}

function getHandlerString(entry: string, handler: string): string {
  const parts = entry.split("/");
  return parts[parts.length - 1].replace(/\.[\w\d]+$/, `.${handler}`);
}

function getInputFilesFromEsbuildMetafile(file: string): Array<string> {
  let metaJson;

  try {
    metaJson = fs.readJsonSync(file);
  } catch (e) {
    throw new Error("There was a problem reading the esbuild metafile.");
  }

  return Object.keys(metaJson.inputs).map((input) => path.resolve(input));
}

function getEsbuildMetafileName(entry: string, handler: string): string {
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

  const appNodeModules = path.join(appPath, "node_modules");

  const tsconfig = path.join(srcPath, "tsconfig.json");
  const hasTsconfig = fs.existsSync(tsconfig);

  const buildPath = path.join(srcPath, buildDir);
  const metafile = path.join(buildPath, getEsbuildMetafileName(entry, handler));

  const entryPath = path.join(srcPath, entry);

  function lint(inputFiles: Array<string>) {
    inputFiles = inputFiles.filter(
      (file: string) =>
        file.indexOf("node_modules") === -1 &&
        (file.endsWith(".ts") || file.endsWith(".js"))
    );

    console.log(chalk.grey("Linting Lambda function source"));

    try {
      const stdout = execSync(
        [
          path.join(appNodeModules, ".bin", "eslint"),
          process.env.NO_COLOR === "true" ? "--no-color" : "--color",
          "--no-error-on-unmatched-pattern",
          "--config",
          path.join(appPath, buildDir, ".eslintrc.internal.js"),
          "--fix",
          // Handling nested ESLint projects in Yarn Workspaces
          // https://github.com/serverless-stack/serverless-stack/issues/11
          "--resolve-plugins-relative-to",
          ".",
          ...inputFiles,
        ].join(" "),
        { cwd: srcPath }
      );
      const output = stdout.toString();
      if (output.trim() !== "") {
        console.log(output);
      }
    } catch (e) {
      console.log(e.stdout.toString());
      throw new Error("There was a problem linting the source.");
    }
  }

  function typeCheck(inputFiles: Array<string>) {
    inputFiles = inputFiles.filter((file: string) => file.endsWith(".ts"));

    if (inputFiles.length === 0) {
      return;
    }

    console.log(chalk.grey("Type checking Lambda function source"));

    try {
      const stdout = execSync(
        [
          path.join(appNodeModules, ".bin", "tsc"),
          "--pretty",
          process.env.NO_COLOR === "true" ? "false" : "true",
          "--noEmit",
        ].join(" "),
        { cwd: srcPath }
      );
      const output = stdout.toString();
      if (output.trim() !== "") {
        console.log(output);
      }
    } catch (e) {
      console.log(e.stdout.toString());
      throw new Error("There was a problem type checking the source.");
    }
  }

  function transpile(entryPath: string): Array<string> {
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

    return getInputFilesFromEsbuildMetafile(metafile);
  }

  const inputFiles = transpile(entryPath);

  lint(inputFiles);

  typeCheck(inputFiles);

  return {
    outDir: srcPath,
    outHandler: `${buildDir}/${getHandlerString(entry, handler)}`,
  };
}
