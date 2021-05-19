import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as spawn from "cross-spawn";
import * as cdk from "@aws-cdk/core";
import * as cxapi from "@aws-cdk/cx-api";
import { execSync } from "child_process";

import { FunctionProps, FunctionHandlerProps } from "./Function";
import { getEsbuildMetafileName } from "./util/nodeBuilder";

const appPath = process.cwd();

/**
 * Finds the path to the tsc package executable by converting the file path of:
 * /Users/spongebob/serverless-stack/node_modules/typescript/dist/index.js
 * to:
 * /Users/spongebob/serverless-stack/node_modules/.bin/tsc
 */
function getTsBinPath(): string {
  const pkg = "typescript";
  const filePath = require.resolve(pkg);
  const matches = filePath.match(/(^.*[/\\]node_modules)[/\\].*$/);

  if (matches === null || !matches[1]) {
    throw new Error(`There was a problem finding ${pkg}`);
  }

  return path.join(matches[1], ".bin", "tsc");
}

/**
 * Uses the current file path and the package name to figure out the path to the
 * CLI. Converts:
 * /Users/spongebob/Sites/serverless-stack/packages/resources/dist/App.js
 * to:
 * /Users/jayair/Sites/serverless-stack/packages/cli
 */
function getSstCliRootPath() {
  const filePath = __dirname;
  const packageName = "resources";
  const packagePath = filePath.slice(
    0,
    filePath.lastIndexOf(packageName) + packageName.length
  );

  return path.join(packagePath, "../cli");
}

function exitWithMessage(message: string) {
  console.error(message);
  process.exit(1);
}

export type DeployProps = AppDeployProps;

/**
 * Deploy props for apps.
 */
export interface AppDeployProps {
  /**
   * The app name, used to prefix stacks.
   *
   * @default - Defaults to empty string
   */
  readonly name?: string;

  /**
   * The stage to deploy this app to.
   *
   * @default - Defaults to dev
   */
  readonly stage?: string;

  /**
   * The region to deploy this app to.
   *
   * @default - Defaults to us-east-1
   */
  readonly region?: string;

  readonly lint?: boolean;
  readonly typeCheck?: boolean;
  readonly buildDir?: string;

  /**
   * The local WebSockets debug enpoint used by `sst start`.
   *
   * @default - Defaults to undefined
   */
  readonly debugEndpoint?: string;
  readonly debugBucketArn?: string;
  readonly debugBucketName?: string;

  /**
   * The callback after synth completes, used by `sst start`.
   *
   * @default - Defaults to undefined
   */
  readonly synthCallback?: (
    lambdaHandlers: Array<FunctionHandlerProps>
  ) => void;
}

export type AppProps = cdk.AppProps;

export class App extends cdk.App {
  /**
   * Is the app being deployed locally
   */
  public readonly local: boolean = false;

  /**
   * The app name
   */
  public readonly name: string;
  public readonly stage: string;
  public readonly region: string;
  public readonly lint: boolean;
  public readonly typeCheck: boolean;
  public readonly buildDir: string;
  public readonly debugEndpoint?: string;
  public readonly debugBucketArn?: string;
  public readonly debugBucketName?: string;
  public defaultFunctionProps: (FunctionProps | ((stack: cdk.Stack) => FunctionProps))[];

  /**
   * The callback after synth completes.
   */
  private readonly synthCallback?: (
    lambdaHandlers: Array<FunctionHandlerProps>
  ) => void;

  /**
   * A list of Lambda functions in the app
   */
  private readonly lambdaHandlers: Array<FunctionHandlerProps> = [];

  /**
   * Skip building Function code
   * Note that on `sst remove`, we set the CDK context "sst:bundling" to false
   *      to signal that we do not want to bundle the Lambda functions. and
   *      we are reading the context here.
   * Also note that CDK disables bundling (ie. zipping) for `cdk destroy` command.
   *      But SST runs `cdk synth` first then manually remove each stack. Hence
   *      we cannot rely on CDK to disable bundling, and we disable it manually
   *      using the context above. This allows us to disable BOTH building and
   *      bundling, where as CDK would only disable the latter. For example,
   *      `cdk destroy` still trys to install Python dependencies in Docker.
   */
  public readonly skipBuild: boolean;

  constructor(deployProps: AppDeployProps = {}, props: AppProps = {}) {
    super(props);

    this.buildDir = deployProps.buildDir || ".build";
    this.stage = deployProps.stage || "dev";
    this.name = deployProps.name || "my-app";
    this.region = deployProps.region || "us-east-1";
    this.lint = deployProps.lint === false ? false : true;
    this.typeCheck = deployProps.typeCheck === false ? false : true;
    this.skipBuild = this.node.tryGetContext("sst:build-functions") === "false";
    this.defaultFunctionProps = [];

    if (deployProps.debugEndpoint) {
      this.local = true;
      this.synthCallback = deployProps.synthCallback;
      this.debugEndpoint = deployProps.debugEndpoint;
      this.debugBucketArn = deployProps.debugBucketArn;
      this.debugBucketName = deployProps.debugBucketName;
    }
  }

  logicalPrefixedName(logicalName: string): string {
    const namePrefix = this.name === "" ? "" : `${this.name}-`;
    return `${this.stage}-${namePrefix}${logicalName}`;
  }

  setDefaultFunctionProps(
    props: FunctionProps | ((stack: cdk.Stack) => FunctionProps)
  ): void {
    this.defaultFunctionProps.push(props);
  }

  synth(options: cdk.StageSynthesisOptions = {}): cxapi.CloudAssembly {
    for (const child of this.node.children) {
      if (
        child instanceof cdk.Stack &&
        child.stackName.indexOf(`${this.stage}-`) !== 0
      ) {
        throw new Error(
          `Stack (${child.stackName}) is not prefixed with the stage. Use sst.Stack or the format {stageName}-${child.stackName}.`
        );
      }
    }
    const cloudAssembly = super.synth(options);

    // Run lint and type check on handler input files
    // Note: do not need to run in two scenarios:
    //  1. do not need to run while debugging because the Lambda functions are
    //     replaced by stubs and have not been transpiled.
    //  2. do not need to run while running resources tests because .eslint file
    //     does not exist inside .build folder.
    //  3. do not need to run if skipBuild is true, ie. sst remove
    if (!this.local && !this.isJestTest() && !this.skipBuild) {
      this.processInputFiles();
    }

    // Run callback after synth has finished
    if (this.synthCallback) {
      this.synthCallback(this.lambdaHandlers);
    }

    return cloudAssembly;
  }

  isJestTest(): boolean {
    // Check the env var set inside test/setup-tests.js
    return process.env.JEST_RESOURCES_TESTS === "enabled";
  }

  registerLambdaHandler(handler: FunctionHandlerProps): void {
    this.lambdaHandlers.push(handler);
  }

  processInputFiles(): void {
    // Get input files
    const inputFilesBySrcPath: {
      [key: string]: { [key: string]: boolean };
    } = {};
    this.lambdaHandlers.forEach(({ srcPath, handler, runtime }) => {
      if (!runtime.startsWith("nodejs")) {
        return;
      }

      const metafile = path.join(
        srcPath,
        this.buildDir,
        getEsbuildMetafileName(handler)
      );
      const files = this.getInputFilesFromEsbuildMetafile(metafile);
      files.forEach((file) => {
        inputFilesBySrcPath[srcPath] = inputFilesBySrcPath[srcPath] || {};
        inputFilesBySrcPath[srcPath][file] = true;
      });
    });

    // Process each srcPath
    Object.keys(inputFilesBySrcPath).forEach((srcPath) => {
      const inputFiles = Object.keys(inputFilesBySrcPath[srcPath]);
      if (this.lint) {
        this.runLint(srcPath, inputFiles);
      }
      if (this.typeCheck) {
        this.runTypeCheck(srcPath, inputFiles);
      }
    });
  }

  getInputFilesFromEsbuildMetafile(file: string): Array<string> {
    let metaJson;

    try {
      metaJson = fs.readJsonSync(file);
    } catch (e) {
      exitWithMessage("There was a problem reading the esbuild metafile.");
    }

    return Object.keys(metaJson.inputs).map((input) => path.resolve(input));
  }

  runLint(srcPath: string, inputFiles: Array<string>): void {
    inputFiles = inputFiles.filter(
      (file: string) =>
        file.indexOf("node_modules") === -1 &&
        (file.endsWith(".ts") || file.endsWith(".js"))
    );

    console.log(chalk.grey("Linting Lambda function source"));

    const response = spawn.sync(
      "node",
      [
        path.join(appPath, this.buildDir, "eslint.js"),
        process.env.NO_COLOR === "true" ? "--no-color" : "--color",
        ...inputFiles,
      ],
      // Using the ownPath instead of the appPath because there are cases
      // where npm flattens the dependecies and this casues eslint to be
      // unable to find the parsers and plugins. The ownPath hack seems
      // to fix this issue.
      // https://github.com/serverless-stack/serverless-stack/pull/68
      // Steps to replicate, repo: https://github.com/jayair/sst-eu-example
      // Do `yarn add standard -D` and `sst build`
      { stdio: "inherit", cwd: getSstCliRootPath() }
    );

    if (response.error) {
      console.log(response.error);
      exitWithMessage("There was a problem linting the source.");
    } else if (response.stderr) {
      console.log(response.stderr);
      exitWithMessage("There was a problem linting the source.");
    } else if (response.status === 1) {
      exitWithMessage("There was a problem linting the source.");
    }
  }

  runTypeCheck(srcPath: string, inputFiles: Array<string>): void {
    inputFiles = inputFiles.filter((file: string) => file.endsWith(".ts"));

    if (inputFiles.length === 0) {
      return;
    }

    console.log(chalk.grey("Type checking Lambda function source"));

    const hasTsconfig = fs.existsSync(path.join(srcPath, "tsconfig.json"));

    if (!hasTsconfig) {
      throw new Error(
        `Cannot find a "tsconfig.json" in the function's srcPath: ${path.resolve(
          srcPath
        )}`
      );
    }

    try {
      const stdout = execSync(
        [
          getTsBinPath(),
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
      exitWithMessage("There was a problem type checking the source.");
    }
  }
}
