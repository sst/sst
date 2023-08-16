import path from "path";
import fs from "fs";
import { IConstruct } from "constructs";
import { Stack } from "./Stack.js";
import {
  SSTConstruct,
  SSTConstructMetadata,
  isSSTConstruct,
  isStackConstruct,
} from "./Construct.js";
import { FunctionProps } from "./Function.js";
import { Permissions } from "./util/permission.js";
import { bindParameters, bindType } from "./util/functionBinding.js";
import { StackProps } from "./Stack.js";
import { FunctionalStack, stack } from "./FunctionalStack.js";
import { createRequire } from "module";
import { Auth } from "./Auth.js";
import { useDeferredTasks } from "./deferred_task.js";
import { AppContext } from "./context.js";
import { useProject } from "../project.js";
import { Logger } from "../logger.js";
import {
  AppProps as CDKAppProps,
  App as CDKApp,
  Stack as CDKStack,
  Tags,
  IAspect,
  CfnResource,
  RemovalPolicy,
  CustomResourceProvider,
  CustomResourceProviderRuntime,
  CustomResource,
  Aspects,
} from "aws-cdk-lib/core";
import { CfnFunction, ILayerVersion } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ArnPrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnLogGroup } from "aws-cdk-lib/aws-logs";
const require = createRequire(import.meta.url);

function exitWithMessage(message: string) {
  console.error(message);
  process.exit(1);
}

/**
 * @internal
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

  readonly buildDir?: string;
  readonly account?: string;
  readonly debugScriptVersion?: string;
  readonly debugIncreaseTimeout?: boolean;

  readonly mode: "deploy" | "dev" | "remove";
  readonly isActiveStack?: (stackName: string) => boolean;
}

type AppRemovalPolicy = Lowercase<RemovalPolicy>;

export type AppProps = CDKAppProps;

/**
 * The App construct extends cdk.App and is used internally by SST.
 */
export class App extends CDKApp {
  /**
   * Whether or not the app is running locally under `sst dev`
   */
  public readonly local: boolean = false;

  /**
   * Whether the app is running locally under start, deploy or remove
   */
  public readonly mode: AppDeployProps["mode"];

  /**
   * The name of your app, comes from the `name` in your `sst.config.ts`
   */
  public readonly name: string;
  /**
   * The stage the app is being deployed to. If this is not specified as the --stage option, it'll default to the stage configured during the initial run of the SST CLI.
   */
  public readonly stage: string;
  /**
   * The region the app is being deployed to. If this is not specified as the --region option in the SST CLI, it'll default to the region in your sst.config.ts.
   */
  public readonly region: string;
  /**
   * The AWS account the app is being deployed to. This comes from the IAM credentials being used to run the SST CLI.
   */
  public readonly account: string;
  /** @internal */
  public readonly debugScriptVersion?: string;
  /** @internal */
  public readonly debugIncreaseTimeout?: boolean;
  /** @internal */
  public readonly appPath: string;
  /** @internal */
  public readonly isActiveStack?: (stackName: string) => boolean;

  /** @internal */
  public defaultFunctionProps: (
    | FunctionProps
    | ((stack: Stack) => FunctionProps)
  )[];
  private _defaultRemovalPolicy?: AppRemovalPolicy;

  /** @internal */
  public get defaultRemovalPolicy() {
    return this._defaultRemovalPolicy;
  }

  /**
   * @internal
   */
  constructor(deployProps: AppDeployProps, props: AppProps = {}) {
    super(props);
    AppContext.provide(this);
    this.appPath = process.cwd();

    this.mode = deployProps.mode;
    this.local = this.mode === "dev";
    this.stage = deployProps.stage || "dev";
    this.name = deployProps.name || "my-app";
    this.region =
      deployProps.region || process.env.CDK_DEFAULT_REGION || "us-east-1";
    this.account =
      deployProps.account || process.env.CDK_DEFAULT_ACCOUNT || "my-account";
    this.isActiveStack = deployProps.isActiveStack;
    this.defaultFunctionProps = [];

    if (this.mode === "dev") {
      this.debugScriptVersion = deployProps.debugScriptVersion;
      this.debugIncreaseTimeout = deployProps.debugIncreaseTimeout;
    }
  }

  /**
   * Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.
   * @example
   * ```js
   * console.log(app.logicalPrefixedName("myTopic"));
   *
   * // dev-my-app-myTopic
   * ```
   */
  public logicalPrefixedName(logicalName: string): string {
    const namePrefix = this.name === "" ? "" : `${this.name}-`;
    return `${this.stage}-${namePrefix}${logicalName}`;
  }

  /**
   * The default removal policy that'll be applied to all the resources in the app. This can be useful to set ephemeral (dev or feature branch) environments to remove all the resources on deletion.
   * :::danger
   * Make sure to not set the default removal policy to `DESTROY` for production environments.
   * :::
   * @example
   * ```js
   * app.setDefaultRemovalPolicy(app.mode === "dev" ? "destroy" : "retain")
   * ```
   */
  public setDefaultRemovalPolicy(policy: AppRemovalPolicy) {
    this._defaultRemovalPolicy = policy;
  }

  /**
   * The default function props to be applied to all the Lambda functions in the app. These default values will be overridden if a Function sets its own props.
   * This needs to be called before a stack with any functions have been added to the app.
   *
   * @example
   * ```js
   * app.setDefaultFunctionProps({
   *   runtime: "nodejs12.x",
   *   timeout: 30
   * })
   * ```
   */
  public setDefaultFunctionProps(
    props: FunctionProps | ((stack: CDKStack) => FunctionProps)
  ): void {
    this.defaultFunctionProps.push(props);
  }

  /**
   * Adds additional default Permissions to be applied to all Lambda functions in the app.
   *
   * @example
   * ```js
   * app.addDefaultFunctionPermissions(["s3"])
   * ```
   */
  public addDefaultFunctionPermissions(permissions: Permissions) {
    this.defaultFunctionProps.push({
      permissions,
    });
  }

  /**
   * Adds additional default environment variables to be applied to all Lambda functions in the app.
   *
   * @example
   * ```js
   * app.addDefaultFunctionEnv({
   *   "MY_ENV_VAR": "my-value"
   * })
   * ```
   */
  public addDefaultFunctionEnv(environment: Record<string, string>) {
    this.defaultFunctionProps.push({
      environment,
    });
  }

  /**
   * Binds additional default resources to be applied to all Lambda functions in the app.
   *
   * @example
   * ```js
   * app.addDefaultFunctionBinding([STRIPE_KEY, bucket]);
   * ```
   */
  public addDefaultFunctionBinding(bind: SSTConstruct[]) {
    this.defaultFunctionProps.push({ bind });
  }

  /**
   * Adds additional default layers to be applied to all Lambda functions in the stack.
   */
  public addDefaultFunctionLayers(layers: ILayerVersion[]) {
    this.defaultFunctionProps.push({
      layers,
    });
  }

  private isFinished = false;
  public async finish() {
    if (this.isFinished) return;
    this.isFinished = true;
    Auth.injectConfig();
    this.buildConstructsMetadata();
    this.ensureUniqueConstructIds();
    this.codegenTypes();

    // Run deferred tasks
    // - after codegen b/c some frontend frameworks (ie. Next.js apps) runs
    //   type checking in the build step
    // - before remove govcloud unsupported resource properties b/c deferred
    //   tasks may add govcloud unsupported resource properties
    await useDeferredTasks().run();

    this.createBindingSsmParameters();
    this.removeGovCloudUnsupportedResourceProperties();
    const { config } = useProject();

    for (const child of this.node.children) {
      if (isStackConstruct(child)) {
        // Tag stacks
        Tags.of(child).add("sst:app", this.name);
        Tags.of(child).add("sst:stage", this.stage);

        // Set removal policy
        this.applyRemovalPolicy(child);

        // Stack names need to be parameterized with the stage name
        if (
          config.advanced?.disableParameterizedStackNameCheck !== true &&
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
  }

  isRunningSSTTest(): boolean {
    // Check the env var set inside test/setup-tests.js
    return process.env.SST_RESOURCES_TESTS === "enabled";
  }

  getInputFilesFromEsbuildMetafile(file: string): Array<string> {
    let metaJson;

    try {
      metaJson = JSON.parse(fs.readFileSync(file).toString());
    } catch (e) {
      exitWithMessage("There was a problem reading the esbuild metafile.");
    }

    return Object.keys(metaJson.inputs).map((input) => path.resolve(input));
  }

  private createBindingSsmParameters() {
    class CreateSsmParameters implements IAspect {
      public visit(c: IConstruct): void {
        if (!isSSTConstruct(c)) {
          return;
        }
        if ("_doNotAllowOthersToBind" in c && c._doNotAllowOthersToBind) {
          return;
        }

        bindParameters(c);
      }
    }

    Aspects.of(this).add(new CreateSsmParameters());
  }

  private buildConstructsMetadata(): void {
    const constructs = this.buildConstructsMetadata_collectConstructs(this);
    type Construct = SSTConstructMetadata & {
      addr: string;
      id: string;
      stack: string;
    };
    const byStack: Record<string, Construct[]> = {};
    const local: Construct[] = [];
    for (const c of constructs) {
      const stack = Stack.of(c);
      const list = byStack[stack.node.id] || [];
      const metadata = c.getConstructMetadata();
      const item: Construct = {
        id: c.node.id,
        addr: c.node.addr,
        stack: Stack.of(c).stackName,
        ...metadata,
      };
      local.push(item);
      list.push({
        ...item,
        local: undefined,
      });
      byStack[stack.node.id] = list;
    }

    // Register constructs
    for (const child of this.node.children) {
      if (child instanceof Stack) {
        const stackName = (child as Stack).node.id;
        (child as Stack).addOutputs({
          SSTMetadata: JSON.stringify({
            app: this.name,
            stage: this.stage,
            version: useProject().version,
            metadata: byStack[stackName] || [],
          }),
        });
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

  private applyRemovalPolicy(current: IConstruct) {
    if (!this._defaultRemovalPolicy) return;

    // Apply removal policy to all resources
    if (current instanceof CfnResource) {
      current.applyRemovalPolicy(
        RemovalPolicy[
          this._defaultRemovalPolicy.toUpperCase() as keyof typeof RemovalPolicy
        ]
      );
    }

    // Remove S3 objects on destroy
    if (
      this._defaultRemovalPolicy === "destroy" &&
      current instanceof Bucket &&
      !current.node.tryFindChild("AutoDeleteObjectsCustomResource")
    ) {
      // Calling a private method here. It's the easiest way to lazily
      // enable auto-delete.
      // @ts-expect-error
      (current as Bucket).enableAutoDeleteObjects();
    }

    current.node.children.forEach((resource) =>
      this.applyRemovalPolicy(resource)
    );
  }

  private removeGovCloudUnsupportedResourceProperties() {
    if (!this.region.startsWith("us-gov-")) {
      return;
    }

    class RemoveGovCloudUnsupportedResourceProperties implements IAspect {
      public visit(node: IConstruct): void {
        if (node instanceof CfnFunction) {
          node.addPropertyDeletionOverride("EphemeralStorage");
        } else if (node instanceof CfnLogGroup) {
          node.addPropertyDeletionOverride("Tags");
        }
      }
    }

    Aspects.of(this).add(new RemoveGovCloudUnsupportedResourceProperties());
  }

  private ensureUniqueConstructIds() {
    // "ids" has the shape of:
    // {
    //   Table: {
    //     "id_with_hyphen": "id-with-hyphen",
    //     "id_with_underscore": "id_with_underscore",
    //   }
    // }
    const ids: Record<string, Record<string, string>> = {};

    class EnsureUniqueConstructIds implements IAspect {
      public visit(c: IConstruct): void {
        if (!isSSTConstruct(c)) {
          return;
        }
        if ("_doNotAllowOthersToBind" in c && c._doNotAllowOthersToBind) {
          return;
        }

        const className = c.constructor.name;
        const id = c.id;
        const normId = id.replace(/-/g, "_");
        const existingIds = ids[className] || {};

        if (!id.match(/^[a-zA-Z]([a-zA-Z0-9-_])*$/)) {
          throw new Error(
            [
              `Invalid id "${id}" for ${className} construct.`,
              ``,
              `Starting v1.16, construct ids can only contain alphabetic characters, hyphens ("-"), and underscores ("_"), and must start with an alphabetic character. If you are migrating from version 1.15 or earlier, please see the upgrade guide — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`,
            ].join("\n")
          );
        } else if (["Parameter", "Secret"].includes(className)) {
          const existingConfigId =
            ids.Secret?.[normId] || ids.Parameter?.[normId];
          if (existingConfigId === id) {
            throw new Error(`ERROR: Config with id "${id}" already exists.`);
          } else if (existingConfigId) {
            throw new Error(
              `ERROR: You cannot have the same Config id with an underscore and hyphen: "${existingConfigId}" and "${id}".`
            );
          }
        } else if (existingIds[normId]) {
          throw new Error(
            [
              existingIds[normId] === id
                ? `${className} with id "${id}" already exists.`
                : `You cannot have the same ${className} id with an underscore and hyphen: "${existingIds[normId]}" and "${id}".`,
              ``,
              `Starting v1.16, constructs must have unique ids for a given construct type. If you are migrating from version 1.15 or earlier, set the "cdk.id" in the construct with the existing id, and pick a unique id for the construct. Please see the upgrade guide — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`,
              ``,
              `    For example, if you have two Bucket constructs with the same id:`,
              `      new Bucket(this, "bucket");`,
              `      new Bucket(this, "bucket");`,
              ``,
              `    Change it to:`,
              `      new Bucket(this, "usersBucket", {`,
              `        cdk: {`,
              `          id: "bucket"`,
              `        }`,
              `      });`,
              `      new Bucket(this, "adminBucket", {`,
              `        cdk: {`,
              `          id: "bucket"`,
              `        }`,
              `      });`,
            ].join("\n")
          );
        }
        existingIds[normId] = id;
        ids[className] = existingIds;
      }
    }

    Aspects.of(this).add(new EnsureUniqueConstructIds());
  }

  public codegenTypes() {
    const project = useProject();

    const typesPath = path.resolve(project.paths.out, "types");
    Logger.debug(`Generating types in ${typesPath}`);

    fs.rmSync(typesPath, {
      recursive: true,
      force: true,
    });
    fs.mkdirSync(typesPath, {
      recursive: true,
    });
    fs.appendFileSync(
      `${typesPath}/index.ts`,
      [
        `import "sst/node/config";`,
        `declare module "sst/node/config" {`,
        `  export interface ConfigTypes {`,
        `    APP: string;`,
        `    STAGE: string;`,
        `  }`,
        `}`,
        ``,
        ``,
      ].join("\n")
    );

    this.foreachConstruct((c) => {
      if (!isSSTConstruct(c)) {
        return;
      }
      if ("_doNotAllowOthersToBind" in c && c._doNotAllowOthersToBind) {
        return;
      }

      const binding = bindType(c);
      if (!binding) {
        return;
      }

      const className = c.constructor.name;
      const id = c.id;

      // Case 1: variable does not have properties, ie. Secrets and Parameters

      fs.appendFileSync(
        `${typesPath}/index.ts`,
        (binding.variables[0] === "."
          ? [
              `import "sst/node/${binding.clientPackage}";`,
              `declare module "sst/node/${binding.clientPackage}" {`,
              `  export interface ${className}Resources {`,
              `    "${id}": string;`,
              `  }`,
              `}`,
              ``,
              ``,
            ]
          : [
              `import "sst/node/${binding.clientPackage}";`,
              `declare module "sst/node/${binding.clientPackage}" {`,
              `  export interface ${className}Resources {`,
              `    "${id}": {`,
              ...binding.variables.map((p) => `      ${p}: string;`),
              `    }`,
              `  }`,
              `}`,
              ``,
              ``,
            ]
        ).join("\n")
      );
    });
  }

  private foreachConstruct(fn: (c: IConstruct) => void) {
    const loop = (parent: IConstruct) => {
      for (const child of parent.node.children) {
        fn(child);
        loop(child);
      }
    };

    for (const child of this.node.children) {
      if (child instanceof Stack) {
        loop(child);
      }
    }
  }

  // Functional Stack
  // This is a magical global to avoid having to pass app everywhere.
  // We only every have one instance of app

  stack<T extends FunctionalStack<any>>(
    fn: T,
    props?: StackProps & { id?: string }
  ): ReturnType<T> extends Promise<any> ? Promise<void> : App {
    return stack(this, fn, props);
  }
}
