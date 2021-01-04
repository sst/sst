import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as esbuild from "esbuild";
import { execSync } from "child_process";

interface BuilderProps {
  readonly srcPath: string;
  readonly handler: string;
  readonly buildDir: string;
}

function addExtensionToHandler(handler: string, extension: string): string {
  return handler.replace(/\.[\w\d]+$/, extension);
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

function getEsbuildMetafileName(srcPath: string, handler: string): string {
  const key = `${srcPath}/${handler}`.replace(/[/.]/g, "-");

  return `.esbuild.${key}.json`;
}

export function builder(builderProps: BuilderProps): string {
  const { srcPath, handler, buildDir } = builderProps;

  console.log(chalk.grey(`Building Lambda function ${srcPath}/${handler}`));

  const external = ["aws-sdk"];

  const appPath = process.cwd();
  const appNodeModules = path.join(appPath, "node_modules");

  const tsconfig = path.join(srcPath, "tsconfig.json");
  const isTs = fs.existsSync(tsconfig);
  const extension = isTs ? ".ts" : ".js";

  const buildPath = path.join(srcPath, buildDir);
  const metafile = path.join(
    buildPath,
    getEsbuildMetafileName(srcPath, handler)
  );

  const entryPoint = path.join(
    srcPath,
    addExtensionToHandler(handler, extension)
  );

  function lint(inputFiles: Array<string>) {
    inputFiles = inputFiles.filter(
      (file: string) => file.indexOf("node_modules") === -1
    );

    console.log(chalk.grey("Linting Lambda function source"));

    try {
      const stdout = execSync(
        [
          path.join(appNodeModules, ".bin", "eslint"),
          "--color",
          "--no-error-on-unmatched-pattern",
          "--config",
          path.join(appPath, buildDir, ".eslintrc.internal.js"),
          "--ext",
          ".js,.ts",
          "--fix",
          // Handling nested ESLint projects in Yarn Workspaces
          // https://github.com/serverless-stack/serverless-stack/issues/11
          "--resolve-plugins-relative-to",
          ".",
          ...inputFiles,
        ].join(" "),
        { cwd: appPath }
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
          "--noEmit",
          ...inputFiles,
        ].join(" "),
        { cwd: appPath }
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

  function transpile(entryPoint: string): Array<string> {
    if (!fs.existsSync(entryPoint)) {
      throw new Error(`Cannot find a handler file at ${entryPoint}".`);
    }

    esbuild.buildSync({
      external,
      metafile,
      bundle: true,
      format: "cjs",
      sourcemap: true,
      platform: "node",
      outdir: buildPath,
      entryPoints: [entryPoint],
      tsconfig: isTs ? tsconfig : undefined,
    });

    return getInputFilesFromEsbuildMetafile(metafile);
  }

  const inputFiles = transpile(entryPoint);

  lint(inputFiles);

  if (isTs) {
    typeCheck(inputFiles);
  }

  return buildPath;
}
