import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import spawn from "cross-spawn";
import * as lambda from "@aws-cdk/aws-lambda";
import { getHandlerFullPosixPath, getHandlerHash } from "./builder";

interface BuilderProps {
  readonly srcPath: string;
  readonly handler: string;
  readonly buildDir: string;
}

interface BuilderOutput {
  readonly outCode: lambda.AssetCode;
  readonly outHandler: string;
}

// Do not re-bundle dependencies for the same srcPath
const existingBundlesBySrcPath: { [srcPath: string]: lambda.AssetCode } = {};

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { srcPath, handler, buildDir } = builderProps;
  const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);

  console.log(chalk.grey(`Building Lambda function ${handler} in ${srcPath}`));

  // Check entry path exists
  // Case: invalid srcPath
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Cannot find the srcPath "${srcPath}".`);
  }

  // On Windows, you cannot have ":" in a folder name
  const appPath = process.cwd();
  const handlerHash = getHandlerHash(handlerPosixPath).replace(/::/g, "-");
  const outputPath = path.join(appPath, buildDir, handlerHash);

  // Compile
  let outCode: lambda.AssetCode;
  if (existingBundlesBySrcPath[srcPath]) {
    outCode = existingBundlesBySrcPath[srcPath];
  } else {
    compile();
    outCode = lambda.Code.fromAsset(outputPath);
    existingBundlesBySrcPath[srcPath] = outCode;
  }

  return {
    outCode,
    outHandler: handler,
  };

  function compile() {
    const response = spawn.sync(
      "dotnet",
      [
        "publish",
        "--output",
        outputPath,
        "--configuration",
        "Release",
        "--framework",
        "netcoreapp3.1",
        "/p:GenerateRuntimeConfigurationFiles=true",
        // warnings are not reported for repeated builds by default and this flag
        // does a clean before build. It takes a little longer to run, but the
        // warnings are consistently printed on each build.
        //"/target:Rebuild",
        "--self-contained",
        "false",
        // do not print "Build Engine version"
        "-nologo",
        // only print errors
        "--verbosity",
        process.env.DEBUG ? "minimal" : "quiet",
      ],
      {
        stdio: "inherit",
        cwd: path.join(appPath, srcPath),
      }
    );

    if (response.status !== 0) {
      throw new Error(
        `There was an problem compiling the handler "${handler}" in "${srcPath}".`
      );
    }
  }
}
