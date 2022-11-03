// import path from "path";
import url from "url";
import path from "path";
import fs from "fs-extra";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { Runtime, DeferBuilder, FunctionBinding } from "@serverless-stack/core";

import { App } from "./App.js";
import { Secret, Parameter } from "./Config.js";
import { SSTConstruct } from "./Construct.js";
import { Function, FunctionBundleNodejsProps } from "./Function.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { bindEnvironment, bindPermissions } from "./util/functionBinding.js";
import { IVpc } from "aws-cdk-lib/aws-ec2";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export type JobMemorySize = "3 GB" | "7 GB" | "15 GB" | "145 GB";

export interface JobProps {
  /**
   * Path to the entry point and handler function. Of the format:
   * `/path/to/file.function`.
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
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
   * new Job(stack, "MyJob", {
   *   srcPath: "services",
   *   handler: "job.handler",
   * })
   *```
   */
  srcPath?: string;
  /**
   * The amount of memory in MB allocated.
   *
   * @default "3 GB"
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   memorySize: "3 GB",
   * })
   *```
   */
  memorySize?: JobMemorySize;
  /**
   * The execution timeout. Minimum 5 minutes. Maximum 8 hours.
   *
   * @default "8 hours"
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   timeout: "30 minutes",
   * })
   *```
   */
  timeout?: Duration;
  /**
   * Can be used to disable Live Lambda Development when using `sst start`. Useful for things like Custom Resources that need to execute during deployment.
   *
   * @default true
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   enableLiveDev: false
   * })
   *```
   */
  enableLiveDev?: boolean;
  /**
   * Configure environment variables for the job
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   environment: {
   *     DEBUG: "*",
   *   }
   * })
   * ```
   */
  environment?: Record<string, string>;
  /**
   * Bind resources for the job
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   bind: [STRIPE_KEY, bucket],
   * })
   * ```
   */
  bind?: SSTConstruct[];
  /**
   * Configure environment variables for the job
   * 
   * @deprecated The "config" prop is deprecated, and will be removed in SST v2. Pass Parameters and Secrets in through the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/constructs/function
   * 
   * @example
   * ```js
   * // Change
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   config: [STRIPE_KEY, API_URL]
   * })
   * 
   * // To
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   bind: [STRIPE_KEY, API_URL]
   * })
   * ```
   */
  config?: (Secret | Parameter)[];
  /**
   * Attaches the given list of permissions to the job. Configuring this property is equivalent to calling `attachPermissions()` after the job is created.
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   permissions: ["ses"]
   * })
   * ```
   */
  permissions?: Permissions;
  cdk?: JobCDKProps;
}

export interface JobCDKProps {
  /**
   * Allows you to override default id for this construct.
   */
  id?: string;
  /**
   * Runs codebuild job in the specified VPC. Note this will only work once deployed.
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   cdk: {
   *     vpc: Vpc.fromLookup(this, "VPC", {
   *       vpcId: "vpc-xxxxxxxxxx",
   *     }),
   *   }
   * })
   * ```
   */
  vpc?: IVpc;
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
  public readonly id: string;
  private readonly localId: string;
  private readonly props: JobProps;
  private readonly job: codebuild.Project;
  private readonly isLiveDevEnabled: boolean;
  public readonly _jobInvoker: Function;

  constructor(scope: Construct, id: string, props: JobProps) {
    super(scope, props.cdk?.id || id);

    const app = this.node.root as App;
    this.id = id;
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
    this.bind(props.bind || []);
    Object.entries(props.environment || {}).forEach(([key, value]) => {
      this.addEnvironment(key, value);
    });
  }

  public getConstructMetadata() {
    return {
      type: "Job" as const,
      data: {},
    };
  }

  /** @internal */
  public getFunctionBinding() {
    return {
      clientPackage: "job",
      variables: {
        functionName: {
          environment: this._jobInvoker.functionName,
          parameter: this._jobInvoker.functionName,
        },
      },
      permissions: {
        "lambda:*": [this._jobInvoker.functionArn],
      },
    };
  }

  /**
   * Binds additional resources to job.
   *
   * @example
   * ```js
   * job.bind([STRIPE_KEY, bucket]);
   * ```
   */
  public bind(constructs: SSTConstruct[]): void {
    this._jobInvoker.bind(constructs);
    this.useForCodeBuild(constructs);
  }

  /**
   * Attaches additional configs to job.
   * 
   * @deprecated The "config" prop is deprecated, and will be removed in SST v2. Pass Parameters and Secrets in through the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/constructs/function
   *
   * @example
   * ```js
   * const STRIPE_KEY = new Config.Secret(stack, "STRIPE_KEY");
   * 
   * // Change
   * job.addConfig([STRIPE_KEY]);
   * 
   * // To
   * job.bind([STRIPE_KEY]);
   * ```
   */
  public addConfig(config: (Secret | Parameter)[]): void {
    const app = this.node.root as App;
    this.bind(config);

    if (config.length > 0) {
      app.reportWarning("usingConfig");
    }
  }

  /**
   * Attaches the given list of [permissions](Permissions.md) to the job. This allows the job to access other AWS resources.
   *
   * @example
   * ```js
   * job.attachPermissions(["ses"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    this._jobInvoker.attachPermissions(permissions);
    this.attachPermissionsForCodeBuild(permissions);
  }

  /**
   * Attaches additional environment variable to the job.
   *
   * @example
   * ```js
   * fn.addEnvironment({
   *   DEBUG: "*"
   * });
   * ```
   */
  public addEnvironment(name: string, value: string): void {
    this._jobInvoker.addEnvironment(name, value);
    this.addEnvironmentForCodeBuild(name, value);
  }

  private createCodeBuildProject(): codebuild.Project {
    const app = this.node.root as App;

    return new codebuild.Project(this, "JobProject", {
      vpc: this.props.cdk?.vpc,
      projectName: app.logicalPrefixedName(this.node.id),
      environment: {
        // CodeBuild offers different build images. The newer ones have much quicker
        // boot time. The latest build image is STANDARD_6_0, which support Node.js 16.
        // But while testing, I found STANDARD_6_0 took 100s to boot. So for the
        // purpose of this demo, I use STANDARD_5_0. It takes 30s to boot.
        //buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
        //buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        buildImage: codebuild.LinuxBuildImage.fromDockerRegistry(
          "amazon/aws-lambda-nodejs:16"
        ),
        computeType: this.normalizeMemorySize(this.props.memorySize || "3 GB"),
      },
      environmentVariables: {
        SST_APP: { value: app.name },
        SST_STAGE: { value: app.stage },
        ...(
          FunctionBinding.ssmPrefix !== ""
            ? { SST_SSM_PREFIX: { value: FunctionBinding.ssmPrefix } }
            : {}
        )
      },
      timeout: this.normalizeTimeout(this.props.timeout || "8 hours"),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands: [
              // commands will be set after the code is built
            ],
          },
        },
      }),
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
          await fs.writeFile(
            path.join(bundled.directory, "handler-wrapper.js"),
            [
              `console.log("")`,
              `console.log("//////////////////////")`,
              `console.log("// Start of the job //")`,
              `console.log("//////////////////////")`,
              `console.log("")`,
              `import { ${module} } from "./${file}.js";`,
              `const event = JSON.parse(process.env.SST_PAYLOAD);`,
              `const result = await ${module}(event);`,
              `console.log("")`,
              `console.log("----------------------")`,
              `console.log("")`,
              `console.log("Result:", result);`,
              `console.log("")`,
              `console.log("//////////////////////")`,
              `console.log("//  End of the job  //")`,
              `console.log("//////////////////////")`,
              `console.log("")`,
            ].join("\n")
          );

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
        resources: [
          `arn:aws:s3:::${codeConfig.s3Location?.bucketName}/${codeConfig.s3Location?.objectKey}`,
        ],
      }),
    ]);
  }

  private createLocalInvoker(): Function {
    const { srcPath, handler, config, environment, permissions } = this.props;

    // Note: make the invoker function the same ID as the Job
    //       construct so users can identify the invoker function
    //       in the Console.
    const fn = new Function(this, this.node.id, {
      srcPath,
      handler,
      bundle: { format: "esm" },
      runtime: "nodejs16.x",
      timeout: 10,
      memorySize: 1024,
      config,
      environment: {
        SST_DEBUG_TYPE: "job",
      },
      permissions,
    });
    fn._disableBind = true;
    return fn;
  }

  private createCodeBuildInvoker(): Function {
    return new Function(this, this.node.id, {
      srcPath: path.resolve(
        path.join(__dirname, "../dist/support/job-invoker")
      ),
      handler: "index.main",
      runtime: "nodejs16.x",
      timeout: 10,
      memorySize: 1024,
      environment: {
        PROJECT_NAME: this.job.projectName,
      },
      permissions: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["codebuild:StartBuild"],
          resources: [this.job.projectArn],
        }),
      ],
      bundle: {
        format: "esm",
      },
    });
  }

  private useForCodeBuild(constructs: SSTConstruct[]): void {
    const app = this.node.root as App;

    constructs.forEach(c => {
      // Bind environment
      const env = bindEnvironment(c);
      Object.entries(env).forEach(([key, value]) =>
        this.addEnvironmentForCodeBuild(key, value)
      );

      // Bind permissions
      const permissions = bindPermissions(c);
      Object.entries(permissions).forEach(([action, resources]) =>
        this.attachPermissionsForCodeBuild([new iam.PolicyStatement({
          actions: [action],
          effect: iam.Effect.ALLOW,
          resources,
        })])
      )
    });
  }

  private attachPermissionsForCodeBuild(permissions: Permissions): void {
    attachPermissionsToRole(this.job.role as iam.Role, permissions);
  }

  private addEnvironmentForCodeBuild(name: string, value: string): void {
    const project = this.job.node.defaultChild as codebuild.CfnProject;
    const env = project.environment as codebuild.CfnProject.EnvironmentProperty;
    const envVars =
      env.environmentVariables as codebuild.CfnProject.EnvironmentVariableProperty[];
    envVars.push({ name, value });
  }

  private normalizeMemorySize(
    memorySize: JobMemorySize
  ): codebuild.ComputeType {
    if (memorySize === "3 GB") {
      return codebuild.ComputeType.SMALL;
    } else if (memorySize === "7 GB") {
      return codebuild.ComputeType.MEDIUM;
    } else if (memorySize === "15 GB") {
      return codebuild.ComputeType.LARGE;
    } else if (memorySize === "145 GB") {
      return codebuild.ComputeType.X2_LARGE;
    }

    throw new Error(`Invalid memory size value for the ${this.node.id} Job.`);
  }

  private normalizeTimeout(timeout: Duration): cdk.Duration {
    const value = toCdkDuration(timeout);
    if (value.toSeconds() < 5 * 60 || value.toSeconds() > 480 * 60) {
      throw new Error(`Invalid timeout value for the ${this.node.id} Job.`);
    }
    return value;
  }
}
