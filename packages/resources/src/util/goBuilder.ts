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
  readonly outCode: lambda.Code;
  readonly outHandler: string;
}

export function builder(builderProps: BuilderProps): BuilderOutput {
  const { srcPath, handler, buildDir } = builderProps;
  const handlerPosixPath = getHandlerFullPosixPath(srcPath, handler);

  console.log(chalk.grey(`Building Lambda function ${handlerPosixPath}`));

  // Check entry path exists
  if (!fs.existsSync(path.join(srcPath, handler))) {
    throw new Error(`Cannot find a handler file at "${srcPath}/${handler}".`);
  }

  const appPath = process.cwd();
  const handlerHash = getHandlerHash(handlerPosixPath);
  const buildOutputPath = path.join(appPath, buildDir, handlerHash);

  // Compile
  compile(srcPath, handler);

  return {
    outCode: lambda.Code.fromAsset(buildOutputPath),
    outHandler: `handler`,
  };

  function compile(srcPath: string, handler: string) {
    const response = spawn.sync(
      "go",
      [
        "build",
        "-ldflags",
        "-s -w",
        "-o",
        path.join(buildOutputPath, "handler"),
        // specify absolute path b/c if "handler" can be a folder, and a relative path does not work
        path.join(appPath, srcPath, handler),
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          GOOS: "linux",
        },
        cwd: path.join(appPath, srcPath),
      }
    );

    if (response.status !== 0) {
      throw new Error(
        `There was an problem compiling the handler at "${srcPath}/${handler}".`
      );
    }
  }
}
