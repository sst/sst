// import path from "path";
import url from "url";
import path from "path";
import fs from "fs-extra";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { State, Runtime, FunctionConfig, DeferBuilder } from "@serverless-stack/core";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Secret, Parameter } from "./Config.js";
import { getFunctionRef, SSTConstruct } from "./Construct.js";
import { Function, FunctionBundleNodejsProps } from "./Function.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { Size, toCdkSize } from "./util/size.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export interface JobProps {
  /**
   * Path to the entry point and handler function. Of the format:
   * `/path/to/file.function`.
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   * })
   *```
   */
  handler: string;
  /**
   * Root directory of the project, typically where package.json is located. Set if using a monorepo with multiple subpackages
   *
   * @default Defaults to the same directory as sst.json
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   srcPath: "packages/backend",
   *   handler: "function.handler",
   * })
   *```
   */
  srcPath?: string;
  /**
   * The amount of memory in MB allocated.
   *
   * @default "1 GB"
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   memorySize: "2 GB",
   * })
   *```
   */
  memorySize?: number | Size;
  /**
   * The execution timeout in seconds.
   *
   * @default "10 seconds"
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   timeout: "30 seconds",
   * })
   *```
   */
  timeout?: number | Duration;
  /**
   * Can be used to disable Live Lambda Development when using `sst start`. Useful for things like Custom Resources that need to execute during deployment.
   *
   * @default true
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   enableLiveDev: false
   * })
   *```
   */
  enableLiveDev?: boolean;
  /**
   * Configure environment variables for the function
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   config: [
   *     STRIPE_KEY,
   *     API_URL,
   *   ]
   * })
   * ```
   */
  config?: (Secret | Parameter)[];
  /**
   * Configure environment variables for the function
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   environment: {
   *     TABLE_NAME: table.tableName,
   *   }
   * })
   * ```
   */
  environment?: Record<string, string>;
  /**
   * Attaches the given list of permissions to the function. Configuring this property is equivalent to calling `attachPermissions()` after the function is created.
   *
   * @example
   * ```js
   * new Function(stack, "Function", {
   *   handler: "src/function.handler",
   *   permissions: ["ses", bucket]
   * })
   * ```
   */
  permissions?: Permissions;
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job.
 *
 * @example
 *
 * ```js
 * import { Cron } from "@serverless-stack/resources";
 *
 * new Cron(stack, "Cron", {
 *   schedule: "rate(1 minute)",
 *   job: "src/lambda.main",
 * });
 * ```
 */
export class Job extends Construct implements SSTConstruct {
  private readonly localId: string;
  private readonly props: JobProps;
  private readonly job: codebuild.Project;
  private readonly isLiveDevEnabled: boolean;
  private static all = new Set<string>();
  public readonly _jobInvoker: Function;

  constructor(scope: Construct, id: string, props: JobProps) {
    super(scope, id);

    // Ensure the id is unique
    Job.assertIdNotInUse(id);
    Job.all.add(id);

    const app = this.node.root as App;

    this.props = props;

    this.localId = path.posix
      .join(scope.node.path, id)
      .replace(/\$/g, "-")
      .replace(/\//g, "-")
      .replace(/\./g, "-");
    this.isLiveDevEnabled = this.props.enableLiveDev === false ? false : true;

    this.job = this.createCodeBuildProject();
    if (app.local && this.isLiveDevEnabled) {
      this._jobInvoker = this.createLocalInvoker();
    } else {
      this._jobInvoker = this.createCodeBuildInvoker();
      this.buildCodeBuildProjectCode();
    }
    this.attachPermissions(props.permissions || []);
    this.addConfig(props.config || []);
  }

  /**
   * The job name.
   */
  public get jobName(): string {
    return this._jobInvoker.functionName;
  }

  private createCodeBuildProject(): codebuild.Project {
    const app = this.node.root as App;

    return new codebuild.Project(this, "JobProject", {
      projectName: app.logicalPrefixedName(this.node.id),
      environment: {
        // CodeBuild offers different build images. The newer ones have much quicker
        // boot time. The latest build image is STANDARD_6_0, which support Node.js 16.
        // But while testing, I found STANDARD_6_0 took 100s to boot. So for the
        // purpose of this demo, I use STANDARD_5_0. It takes 30s to boot.
        //buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
        //buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        buildImage: codebuild.LinuxBuildImage.fromDockerRegistry("amazon/aws-lambda-nodejs:16"),
        // CodeBuild offers a few differnt Memory/CPU options. SMALL comes with
        // 3GB memory and 2 vCPUs.
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        SST_APP: { value: app.name },
        SST_STAGE: { value: app.stage },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              // commands will be set after the code is built
            ],
          },
        },
      })
    });
  }

  private buildCodeBuildProjectCode() {
    const {
      handler,
      srcPath: srcPathRaw,
      enableLiveDev: enableLiveDevRaw,
    } = this.props;
    const srcPath = Function.normalizeSrcPath(srcPathRaw || ".");
    const bundle = { format: "esm" } as FunctionBundleNodejsProps;

    const app = this.node.root as App;

    // Handle remove (ie. sst remove)
    if (app.skipBuild) {
      // do nothing
    }
    // Handle build
    else {
      DeferBuilder.addTask(async () => {
        // Build function
        const bundled = await Runtime.Handler.bundle({
          id: this.localId,
          root: app.appPath,
          handler,
          runtime: "nodejs16.x",
          srcPath,
          bundle,
        })!;

        // This should always be true b/c runtime is always Node.js
        if ("directory" in bundled) {
          // handle copy files
          Function.copyFiles(bundle, srcPath, bundled.directory);

          // create wrapper that calls the handler
          const [file, module] = bundled.handler.split(".");
          await fs.writeFile(path.join(bundled.directory, "handler-wrapper.js"), [
            `import { ${module} } from "./${file}.js";`,
            `const event = JSON.parse(process.env.SST_PAYLOAD);`,
            `const result = await ${module}(event);`,
            `console.log(result);`,
          ].join("\n"));

          const code = lambda.AssetCode.fromAsset(bundled.directory);
          this.updateCodeBuildProjectCode(code, "handler-wrapper.js");
        }
      });
    }
  }

  private updateCodeBuildProjectCode(code: lambda.Code, script: string) {
    // Update job's commands
    const codeConfig = code.bind(this);
    const project = this.job.node.defaultChild as codebuild.CfnProject;
    project.source = {
      type: "S3",
      location: `${codeConfig.s3Location?.bucketName}/${codeConfig.s3Location?.objectKey}`,
      buildSpec: [
        "version: 0.2",
        "phases:",
        "  build:",
        "    commands:",
        `      - node ${script}`,
      ].join("\n"),
    };

    this.attachPermissions([
      new iam.PolicyStatement({
        actions: ["s3:*"],
        effect: iam.Effect.ALLOW,
        resources: [`arn:aws:s3:::${codeConfig.s3Location?.bucketName}/${codeConfig.s3Location?.objectKey}`],
      }),
    ]);
  }

  private createLocalInvoker(): Function {
    const { srcPath, handler, memorySize, timeout, config, environment, permissions } = this.props;

    // Note: make the invoker function the same ID as the Job
    //       construct so users can identify the invoker function
    //       in the Console.
    return new Function(this, this.node.id, {
      srcPath,
      handler,
      bundle: { format: "esm" },
      runtime: "nodejs16.x",
      memorySize,
      timeout,
      config,
      environment,
      permissions,
    });
  }

  private createCodeBuildInvoker(): Function {
    return new Function(this, this.node.id, {
      // TODO remove
      srcPath: path.resolve(path.join("/Users/frank/Sites/sst-playground/node_modules/@serverless-stack/resources/dist/", "../dist/support/job-invoker")),
      //srcPath: path.resolve(path.join(__dirname, "../dist/support/job-invoker")),
      handler: "index.main",
      runtime: "nodejs16.x",
      timeout: 20,
      memorySize: 1024,
      environment: {
        PROJECT_NAME: this.job.projectName,
      },
      permissions: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["codebuild:StartBuild"],
          resources: [this.job.projectArn],
        })
      ],
      bundle: {
        format: "esm",
      },
    });
  }

  /**
   * Attaches additional configs to function
   *
   * @example
   * ```js
   * const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
   *
   * fn.addConfig([STRIPE_KEY]);
   * ```
   */
  public addConfig(config: (Secret | Parameter)[]): void {
    this._jobInvoker.addConfig(config);
    this.addConfigForCodeBuild(config);
  }

  private addConfigForCodeBuild(config: (Secret | Parameter)[]): void {
    const app = this.node.root as App;

    // Add environment variables
    (config || []).forEach((c) => {
      if (c instanceof Secret) {
        this.addEnvironmentForCodeBuild(
          `${FunctionConfig.SECRET_ENV_PREFIX}${c.name}`,
          "1"
        );
      } else if (c instanceof Parameter) {
        this.addEnvironmentForCodeBuild(
          `${FunctionConfig.PARAM_ENV_PREFIX}${c.name}`,
          c.value
        );
      }
    });

    // Attach permissions
    const iamResources: string[] = [];
    (config || [])
      .filter((c) => c instanceof Secret)
      .forEach((c) =>
        iamResources.push(
          `arn:aws:ssm:${app.region}:${app.account
          }:parameter${FunctionConfig.buildSsmNameForSecret(
            app.name,
            app.stage,
            c.name
          )}`,
          `arn:aws:ssm:${app.region}:${app.account
          }:parameter${FunctionConfig.buildSsmNameForSecretFallback(
            app.name,
            c.name
          )}`
        )
      );
    if (iamResources.length > 0) {
      this.attachPermissionsForCodeBuild([
        new iam.PolicyStatement({
          actions: ["ssm:GetParameters"],
          effect: iam.Effect.ALLOW,
          resources: iamResources,
        }),
      ]);
    }
  }

  /**
   * Attaches the given list of [permissions](Permissions.md) to the `jobFunction`. This allows the function to access other AWS resources.
   *
   * Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).
   *
   */
  public attachPermissions(permissions: Permissions): void {
    this._jobInvoker.attachPermissions(permissions);
    this.attachPermissionsForCodeBuild(permissions);
  }

  private attachPermissionsForCodeBuild(permissions: Permissions): void {
    attachPermissionsToRole(this.job.role as iam.Role, permissions);
  }

  /**
   * Attaches additional environment variable to function
   *
   * @example
   * ```js
   * const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
   *
   * fn.addConfig([STRIPE_KEY]);
   * ```
   */
  public addEnvironment(name: string, value: string): void {
    this._jobInvoker.addEnvironment(name, value);
    this.addEnvironmentForCodeBuild(name, value);
  }

  private addEnvironmentForCodeBuild(name: string, value: string): void {
    const project = this.job.node.defaultChild as codebuild.CfnProject;
    const env = project.environment as codebuild.CfnProject.EnvironmentProperty;
    const envVars = env.environmentVariables as codebuild.CfnProject.EnvironmentVariableProperty[];
    envVars.push({ name, value });
  }

  public getConstructMetadata() {
    return {
      type: "Job" as const,
      data: {
        //schedule: cfnRule.scheduleExpression,
        //ruleName: this.cdk.rule.ruleName,
        //job: getFunctionRef(this.jobFunction),
      },
    };
  }

  private static assertIdNotInUse(id: string) {
    if (Job.all.has(id)) {
      throw new Error(`Job ${id} already exists`);
    }
  }
}