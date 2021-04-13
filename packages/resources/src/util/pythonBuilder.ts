import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as lambda from "@aws-cdk/aws-lambda";
import { bundle } from "./python/bundling";
import { addExtensionToHandler, getHandlerFullPosixPath } from "./builder";

interface BuilderProps {
  readonly runtime: lambda.Runtime;
  readonly srcPath: string;
  readonly handler: string;
}

interface BuilderOutput {
  readonly outZip: lambda.Code;
  readonly outHandler: string;
}

// Do not re-bundle dependencies for the same srcPath
const existingBundlesBySrcPath: { [srcPath: string]: lambda.Code } = {};

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { runtime, srcPath, handler } = builderProps;
  const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);

  console.log(chalk.grey(`Building Lambda function ${handlerPosixPath}`));

  // Check entry path exists
  const entryPath = path.join(srcPath, addExtensionToHandler(handler, ".py"));
  if (!fs.existsSync(path.join(entryPath))) {
    throw new Error(`Cannot find a handler file at "${entryPath}".`);
  }

  // Bundle dependency with code
  let outZip;
  if (existingBundlesBySrcPath[srcPath]) {
    outZip = existingBundlesBySrcPath[srcPath];
  } else {
    console.log(
      chalk.grey(`Bundling dependencies for ${srcPath} in Docker...`)
    );
    outZip = bundle({
      runtime,
      entry: srcPath,
      outputPathSuffix: ".",
    });
    existingBundlesBySrcPath[srcPath] = outZip;
  }

  // ie.
  // handler     /src/lambda.main
  // outHandler  lambda.main
  return {
    outZip,
    outHandler: path.basename(handler),
  };
}
