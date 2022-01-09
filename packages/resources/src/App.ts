import * as path from "path";
import * as fs from "fs-extra";
import * as cdk from "aws-cdk-lib";
import { IConstruct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { ILayerVersion } from "aws-cdk-lib/aws-lambda";
import * as cxapi from "aws-cdk-lib/cx-api";
import { State } from "@serverless-stack/core";
import { Stack } from "./Stack";
import {
  SSTConstruct,
  isSSTConstruct,
  SSTConstructMetadata,
} from "./Construct";
import { FunctionProps, FunctionHandlerProps } from "./Function";
import { BaseSiteEnvironmentOutputsInfo } from "./BaseSite";
import { Permissions } from "./util/permission";

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
  readonly skipBuild?: boolean;
  readonly esbuildConfig?: string;
  readonly debugEndpoint?: string;
  readonly debugBucketArn?: string;
  readonly debugBucketName?: string;
  readonly debugStartedAt?: number;
  readonly debugBridge?: string;
  readonly debugIncreaseTimeout?: boolean;

  /**
   * The callback after synth completes, used by `sst start`.
   *
   * @default - Defaults to undefined
   */
  readonly synthCallback?: (
    lambdaHandlers: FunctionHandlerProps[],
    siteEnvironments: BaseSiteEnvironmentOutputsInfo[]
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
  public readonly account: string;
  public readonly typeCheck: boolean;
  public readonly buildDir: string;
  public readonly esbuildConfig?: string;
  public readonly debugBridge?: string;
  public readonly debugEndpoint?: string;
  public readonly debugBucketArn?: string;
  public readonly debugBucketName?: string;
  public readonly debugStartedAt?: number;
  public readonly debugIncreaseTimeout?: boolean;
  public readonly appPath: string;

  public defaultFunctionProps: (
    | FunctionProps
    | ((stack: cdk.Stack) => FunctionProps)
  )[];
  private _defaultRemovalPolicy?: cdk.RemovalPolicy;
  public get defaultRemovalPolicy() {
    return this._defaultRemovalPolicy;
  }

  /**
   * The callback after synth completes.
   */
  private readonly synthCallback?: (
    lambdaHandlers: FunctionHandlerProps[],
    siteEnvironments: BaseSiteEnvironmentOutputsInfo[]
  ) => void;

  /**
   * A list of Lambda functions in the app
   */
  private readonly lambdaHandlers: FunctionHandlerProps[] = [];
  private readonly siteEnvironments: BaseSiteEnvironmentOutputsInfo[] = [];

  /**
   * Skip building Function code
   * Note that on `sst remove`, we do not want to bundle the Lambda functions.
   *      CDK disables bundling (ie. zipping) for `cdk destroy` command.
   *      But SST runs `cdk synth` first then manually remove each stack. Hence
   *      we cannot rely on CDK to disable bundling, and we disable it manually.
   *      This allows us to disable BOTH building and bundling, where as CDK
   *      would only disable the latter. For example, `cdk destroy` still trys
   *      to install Python dependencies in Docker.
   */
  public readonly skipBuild: boolean;

  constructor(deployProps: AppDeployProps = {}, props: AppProps = {}) {
    super(props);
    this.appPath = process.cwd();

    this.stage = deployProps.stage || "dev";
    this.name = deployProps.name || "my-app";
    this.region =
      deployProps.region || process.env.CDK_DEFAULT_REGION || "us-east-1";
    this.lint = deployProps.lint === false ? false : true;
    this.account = process.env.CDK_DEFAULT_ACCOUNT || "my-account";
    this.typeCheck = deployProps.typeCheck === false ? false : true;
    this.esbuildConfig = deployProps.esbuildConfig;
    this.buildDir = deployProps.buildDir || ".build";
    this.skipBuild = deployProps.skipBuild || false;
    this.defaultFunctionProps = [];
    this.synthCallback = deployProps.synthCallback;

    if (deployProps.debugEndpoint) {
      this.local = true;
      State.Function.reset(this.appPath);
      this.debugEndpoint = deployProps.debugEndpoint;
      this.debugBucketArn = deployProps.debugBucketArn;
      this.debugBucketName = deployProps.debugBucketName;
      this.debugStartedAt = deployProps.debugStartedAt;
      this.debugIncreaseTimeout = deployProps.debugIncreaseTimeout;
      if (deployProps.debugBridge) {
        this.debugBridge = deployProps.debugBridge;
      }
    }
  }

  logicalPrefixedName(logicalName: string): string {
    const namePrefix = this.name === "" ? "" : `${this.name}-`;
    return `${this.stage}-${namePrefix}${logicalName}`;
  }

  setDefaultRemovalPolicy(policy: cdk.RemovalPolicy) {
    this._defaultRemovalPolicy = policy;
  }

  setDefaultFunctionProps(
    props: FunctionProps | ((stack: cdk.Stack) => FunctionProps)
  ): void {
    if (this.lambdaHandlers.length > 0)
      throw new Error(
        "Cannot call 'setDefaultFunctionProps' after a stack with functions has been created. Please use 'addDefaultFunctionEnv' or 'addDefaultFunctionPermissions' to add more default properties. Read more about this change here: https://docs.serverless-stack.com/constructs/App#upgrading-to-v0420"
      );
    this.defaultFunctionProps.push(props);
  }

  addDefaultFunctionPermissions(permissions: Permissions) {
    this.defaultFunctionProps.push({
      permissions,
    });
  }

  addDefaultFunctionEnv(environment: Record<string, string>) {
    this.defaultFunctionProps.push({
      environment,
    });
  }

  addDefaultFunctionLayers(layers: ILayerVersion[]) {
    this.defaultFunctionProps.push({
      layers,
    });
  }

  synth(options: cdk.StageSynthesisOptions = {}): cxapi.CloudAssembly {
    this.buildConstructsMetadata();

    for (const child of this.node.children) {
      if (child instanceof cdk.Stack) {
        // Tag stacks
        cdk.Tags.of(child).add("sst:app", this.name);
        cdk.Tags.of(child).add("sst:stage", this.stage);

        // Set removal policy
        if (this._defaultRemovalPolicy)
          this.applyRemovalPolicy(child, this._defaultRemovalPolicy);

        // Stack names need to be parameterized with the stage name
        if (
          !child.stackName.startsWith(`${this.stage}-`) &&
          !child.stackName.endsWith(`-${this.stage}`) &&
          child.stackName.indexOf(`-${this.stage}-`) === -1
        ) {
          throw new Error(
            `Stack "${child.stackName}" is not parameterized with the stage name. The stack name needs to either start with "$stage-", end in "-$stage", or contain the stage name "-$stage-".`
          );
        }
      }
    }

    const cloudAssembly = super.synth(options);

    // Run callback after synth has finished
    if (this.synthCallback) {
      this.synthCallback(this.lambdaHandlers, this.siteEnvironments);
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

  registerSiteEnvironment(environment: BaseSiteEnvironmentOutputsInfo): void {
    this.siteEnvironments.push(environment);
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

  private buildConstructsMetadata(): void {
    const constructs = this.buildConstructsMetadata_collectConstructs(this);
    const byStack: Record<
      string,
      (SSTConstructMetadata & {
        addr: string;
        id: string;
        stack: string;
      })[]
    > = {};
    for (const c of constructs) {
      const stack = Stack.of(c);
      const list = byStack[stack.node.id] || [];
      const metadata = c.getConstructMetadata();
      list.push({
        id: c.node.id,
        addr: c.node.addr,
        stack: Stack.of(c).stackName,
        ...metadata,
      });
      byStack[stack.node.id] = list;
    }

    // Register constructs
    for (const child of this.node.children) {
      if (child instanceof Stack) {
        const stackName = (child as Stack).node.id;
        (child as Stack).addConstructsMetadata(byStack[stackName] || []);
      }
    }
  }

  private buildConstructsMetadata_collectConstructs(
    construct: IConstruct
  ): (SSTConstruct & IConstruct)[] {
    return [
      isSSTConstruct(construct) ? construct : undefined,
      ...construct.node.children.flatMap((c) =>
        this.buildConstructsMetadata_collectConstructs(c)
      ),
    ].filter((c): c is SSTConstruct & IConstruct => Boolean(c));
  }

  private applyRemovalPolicy(
    current: IConstruct,
    policy: cdk.RemovalPolicy
  ) {
    if (current instanceof cdk.CfnResource) current.applyRemovalPolicy(policy);

    // Had to copy this in to enable deleting objects in bucket
    // https://github.com/aws/aws-cdk/blob/master/packages/%40aws-cdk/aws-s3/lib/bucket.ts#L1910
    if (
      current instanceof s3.Bucket &&
      !current.node.tryFindChild("AutoDeleteObjectsCustomResource")
    ) {
      const AUTO_DELETE_OBJECTS_RESOURCE_TYPE = "Custom::S3AutoDeleteObjects";
      const provider = cdk.CustomResourceProvider.getOrCreateProvider(
        current,
        AUTO_DELETE_OBJECTS_RESOURCE_TYPE,
        {
          codeDirectory: path.join(
            require.resolve("aws-cdk-lib/aws-s3"),
            "../auto-delete-objects-handler"
          ),
          runtime: cdk.CustomResourceProviderRuntime.NODEJS_12_X,
          description: `Lambda function for auto-deleting objects in ${current.bucketName} S3 bucket.`,
        }
      );

      // Use a bucket policy to allow the custom resource to delete
      // objects in the bucket
      current.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: [
            // list objects
            "s3:GetBucket*",
            "s3:List*",
            // and then delete them
            "s3:DeleteObject*",
          ],
          resources: [current.bucketArn, current.arnForObjects("*")],
          principals: [new iam.ArnPrincipal(provider.roleArn)],
        })
      );

      const customResource = new cdk.CustomResource(
        current,
        "AutoDeleteObjectsCustomResource",
        {
          resourceType: AUTO_DELETE_OBJECTS_RESOURCE_TYPE,
          serviceToken: provider.serviceToken,
          properties: {
            BucketName: current.bucketName,
          },
        }
      );

      // Ensure bucket policy is deleted AFTER the custom resource otherwise
      // we don't have permissions to list and delete in the bucket.
      // (add a `if` to make TS happy)
      if (current.policy) {
        customResource.node.addDependency(current.policy);
      }
    }
    current.node.children.forEach((resource) =>
      this.applyRemovalPolicy(resource, policy)
    );
  }
}
