import chalk from "chalk";
import * as path from "path";
import * as fs from "fs-extra";
import * as spawn from "cross-spawn";
import * as cdk from "@aws-cdk/core";
import * as cxapi from "@aws-cdk/cx-api";
import { execSync } from "child_process";
import { FunctionHandlerProps } from "./Function";
import { getEsbuildMetafileName } from "./util/builder";

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

  readonly buildDir?: string;

  /**
   * The path to SST CLI. Needs to be passed in because it maybe installed globally.
   * Used to for setting eslint cwd.
   *
   * @default - Defaults to undefined
   */
  readonly sstCliPath?: string;

  /**
   * The local WebSockets debug enpoint used by `sst start`.
   *
   * @default - Defaults to undefined
   */
  readonly debugEndpoint?: string;

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

  /**
   * The stage to deploy to
   */
  public readonly stage: string;

  /**
   * The region to deploy to
   */
  public readonly region: string;

  public readonly lint: boolean;

  public readonly buildDir: string;

  /**
   * The path to SST CLI. Needs to be passed in because it maybe installed globally.
   * Used to for setting eslint cwd.
   */
  readonly sstCliPath?: string;

  /**
   * The local WebSockets debug endpoint
   */
  public readonly debugEndpoint?: string;

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

  constructor(deployProps: AppDeployProps = {}, props: AppProps = {}) {
    super(props);

    this.buildDir = deployProps.buildDir || ".build";
    this.stage = deployProps.stage || "dev";
    this.name = deployProps.name || "my-app";
    this.region = deployProps.region || "us-east-1";
    this.lint = deployProps.lint === false ? false : true;

    this.sstCliPath = deployProps.sstCliPath;

    if (deployProps.debugEndpoint) {
      this.local = true;
      this.debugEndpoint = deployProps.debugEndpoint;
      this.synthCallback = deployProps.synthCallback;
    }
  }

  logicalPrefixedName(logicalName: string): string {
    const namePrefix = this.name === "" ? "" : `${this.name}-`;
    return `${this.stage}-${namePrefix}${logicalName}`;
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
    if (!this.local && !this.isJestTest()) {
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
    this.lambdaHandlers.forEach(({ srcPath, handler }) => {
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
      this.runTypeCheck(srcPath, inputFiles);
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
      { stdio: "inherit", cwd: this.sstCliPath }
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
