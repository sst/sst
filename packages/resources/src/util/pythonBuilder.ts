import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as lambda from "@aws-cdk/aws-lambda";
import { bundle as bundlePython } from "./python/bundling";
import { FunctionBundlePythonProps } from "../Function";
import { addExtensionToHandler, getHandlerFullPosixPath } from "./builder";

interface BuilderProps {
  readonly stack: string;
  readonly srcPath: string;
  readonly handler: string;
  readonly runtime: lambda.Runtime;
  readonly bundle: FunctionBundlePythonProps;
}

interface BuilderOutput {
  readonly outCode: lambda.AssetCode;
  readonly outHandler: string;
}

// Do not re-bundle dependencies for the same srcPath in the same Stack
// Note: if functions from different stacks have the same srcPath, we need to
//       generate the asset for each srcPath, because an asset is tied to a
//       stack. Otherwise, you will get this error:
//
//       Error: Asset is already associated with another stack 'xxxx'.
//              Create a new Code instance for every stack.
const existingBundlesByStackSrcPath: { [stackSrcPath: string]: lambda.AssetCode } = {};

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { stack, bundle, runtime, srcPath, handler } = builderProps;
  const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);

  console.log(chalk.grey(`Building Lambda function ${handlerPosixPath}`));

  // Check entry path exists
  const entryPath = path.join(srcPath, addExtensionToHandler(handler, ".py"));
  if (!fs.existsSync(path.join(entryPath))) {
    throw new Error(`Cannot find a handler file at "${entryPath}".`);
  }

  // Bundle dependency with code
  let outCode: lambda.AssetCode;
  const stackSrcPath = `${stack}/${srcPath}`;
  if (existingBundlesByStackSrcPath[stackSrcPath]) {
    outCode = existingBundlesByStackSrcPath[stackSrcPath];
  } else {
    console.log(
      chalk.grey(`Bundling dependencies for ${srcPath} in Docker...`)
    );
    outCode = bundlePython({
      installCommands: bundle && bundle.installCommands,
      runtime,
      entry: srcPath,
      outputPathSuffix: ".",
    });
    existingBundlesByStackSrcPath[stackSrcPath] = outCode;
  }

  return {
    outCode,
    outHandler: handler,
  };
}
