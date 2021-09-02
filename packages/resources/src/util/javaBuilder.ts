import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import spawn from "cross-spawn";
import * as lambda from "@aws-cdk/aws-lambda";
import { getHandlerFullPosixPath, getHandlerHash } from "./builder";

interface BuilderProps {
  readonly stack: string;
  readonly srcPath: string;
  readonly handler: string;
  readonly buildDir: string;
}

interface BuilderOutput {
  readonly outCode: lambda.AssetCode;
  readonly outHandler: string;
}

// Do not re-bundle dependencies for the same srcPath
// Note: if functions from different stacks have the same srcPath, we need to
//       generate the asset for each srcPath, because an asset is tied to a
//       stack. Otherwise, you will get this error:
//
//       Error: Asset is already associated with another stack 'xxxx'.
//              Create a new Code instance for every stack.
const existingBundlesByStackSrcPath: { [stackSrcPath: string]: lambda.AssetCode } = {};

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { stack, srcPath, handler, buildDir } = builderProps;
  const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);

  console.log(chalk.grey(`Building Lambda function ${handler} in ${srcPath}`));

  // Check entry path exists
  // Case: invalid srcPath
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Cannot find the srcPath "${srcPath}".`);
  }

  // Only allow "sbt" bundler
  if (!fs.existsSync(path.join(srcPath, "build.sbt"))) {
    throw new Error(`Cannot find the "build.sbt" file in the srcPath "${srcPath}". Only projects built using sbt are currently supported.`);
  }

  // On Windows, you cannot have ":" in a folder name
  const appPath = process.cwd();
  const handlerHash = getHandlerHash(handlerPosixPath).replace(/::/g, "-");
  const outputPath = path.join(appPath, buildDir, handlerHash, "index.jar");

  // Compile
  let outCode: lambda.AssetCode;
  const stackSrcPath = `${stack}/${srcPath}`;
  if (existingBundlesByStackSrcPath[stackSrcPath]) {
    outCode = existingBundlesByStackSrcPath[stackSrcPath];
  } else {
    compile();
    outCode = lambda.Code.fromAsset(outputPath);
    existingBundlesByStackSrcPath[stackSrcPath] = outCode;
  }

  return {
    outCode,
    outHandler: handler,
  };

  function compile() {
    const response = spawn.sync(
      "sbt",
      [
        "set test in assembly := {}",
        `set assemblyOutputPath in assembly := new File("${outputPath}")`,
        "assembly",
        //// do not print "Build Engine version"
        //"-nologo",
        //// only print errors
        //"--verbosity",
        //process.env.DEBUG ? "minimal" : "quiet",
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
