// import path from "path";
import url from "url";
import path from "path";
import fs from "fs/promises";
import { Construct } from "constructs";
import { Duration as CdkDuration } from "aws-cdk-lib";
import { PolicyStatement, Role, Effect } from "aws-cdk-lib/aws-iam";
import { AssetCode, Code } from "aws-cdk-lib/aws-lambda";
import {
  Project,
  CfnProject,
  LinuxBuildImage,
  BuildSpec,
  ComputeType,
} from "aws-cdk-lib/aws-codebuild";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Secret } from "./Config.js";
import { SSTConstruct } from "./Construct.js";
import { Function, useFunctions, NodeJSProps } from "./Function.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import {
  FunctionBindingProps,
  bindEnvironment,
  bindPermissions,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { useDeferredTasks } from "./deferred_task.js";
import { useProject } from "../project.js";
import { useRuntimeHandlers } from "../runtime/handlers.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export type JobMemorySize = "3 GB" | "7 GB" | "15 GB" | "145 GB";
export interface JobNodeJSProps extends NodeJSProps {}

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
   * Used to configure nodejs function properties
   */
  nodejs?: JobNodeJSProps;
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
  cdk?: {
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
     *     vpc: Vpc.fromLookup(stack, "VPC", {
     *       vpcId: "vpc-xxxxxxxxxx",
     *     }),
     *   }
     * })
     * ```
     */
    vpc?: IVpc;
  };
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
  private readonly job: Project;
  public readonly _jobInvoker: Function;

  constructor(scope: Construct, id: string, props: JobProps) {
    super(scope, props.cdk?.id || id);

    const app = this.node.root as App;
    this.id = id;
    this.props = props;
    useFunctions().add(this.node.addr, {
      ...props,
      runtime: "nodejs16.x",
    });
    this.localId = path.posix
      .join(scope.node.path, id)
      .replace(/\$/g, "-")
      .replace(/\//g, "-")
      .replace(/\./g, "-");
    const isLiveDevEnabled =
      app.local && (this.props.enableLiveDev === false ? false : true);

    this.job = this.createCodeBuildProject();
    if (isLiveDevEnabled) {
      this._jobInvoker = this.createLocalInvoker();
    } else {
      this._jobInvoker = this.createCodeBuildInvoker();
      this.buildCodeBuildProjectCode();
    }
    this.attachPermissions(props.permissions || []);
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
  public getFunctionBinding(): FunctionBindingProps {
    return {
      clientPackage: "job",
      variables: {
        functionName: {
          type: "plain",
          value: this._jobInvoker.functionName,
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
    this.bindForCodeBuild(constructs);
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

  private createCodeBuildProject(): Project {
    const app = this.node.root as App;

    return new Project(this, "JobProject", {
      vpc: this.props.cdk?.vpc,
      projectName: app.logicalPrefixedName(this.node.id),
      environment: {
        // CodeBuild offers different build images. The newer ones have much quicker
        // boot time. The latest build image is STANDARD_6_0, which support Node.js 16.
        // But while testing, I found STANDARD_6_0 took 100s to boot. So for the
        // purpose of this demo, I use STANDARD_5_0. It takes 30s to boot.
        //buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
        //buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        buildImage: LinuxBuildImage.fromDockerRegistry(
          "amazon/aws-lambda-nodejs:16"
        ),
        computeType: this.normalizeMemorySize(this.props.memorySize || "3 GB"),
      },
      environmentVariables: {
        SST_APP: { value: app.name },
        SST_STAGE: { value: app.stage },
        SST_SSM_PREFIX: { value: useProject().config.ssmPrefix },
      },
      timeout: this.normalizeTimeout(this.props.timeout || "8 hours"),
      buildSpec: BuildSpec.fromObject({
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
    const app = this.node.root as App;

    // Handle remove (ie. sst remove)
    if (app.mode === "remove") return;

    useDeferredTasks().add(async () => {
      // Build function
      const bundle = await useRuntimeHandlers().build(this.node.addr, "deploy");

      // create wrapper that calls the handler
      if (bundle.type === "error")
        throw new Error(`Failed to build job "${this.props.handler}"`);

      const parsed = path.parse(bundle.handler);
      const importName = parsed.ext.substring(1);
      const importPath = `./${path.join(parsed.dir, parsed.name)}.mjs`;
      await fs.writeFile(
        path.join(bundle.out, "handler-wrapper.mjs"),
        [
          `console.log("")`,
          `console.log("//////////////////////")`,
          `console.log("// Start of the job //")`,
          `console.log("//////////////////////")`,
          `console.log("")`,
          `import { ${importName} } from "${importPath}";`,
          `const event = JSON.parse(process.env.SST_PAYLOAD);`,
          `const result = await ${importName}(event);`,
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

      const code = AssetCode.fromAsset(bundle.out);
      this.updateCodeBuildProjectCode(code, "handler-wrapper.mjs");
      // This should always be true b/c runtime is always Node.js
    });
  }

  private updateCodeBuildProjectCode(code: Code, script: string) {
    // Update job's commands
    const codeConfig = code.bind(this);
    const project = this.job.node.defaultChild as CfnProject;
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
      new PolicyStatement({
        actions: ["s3:*"],
        effect: Effect.ALLOW,
        resources: [
          `arn:${Stack.of(this).partition}:s3:::${
            codeConfig.s3Location?.bucketName
          }/${codeConfig.s3Location?.objectKey}`,
        ],
      }),
    ]);
  }

  private createLocalInvoker(): Function {
    const { handler, permissions } = this.props;

    // Note: make the invoker function the same ID as the Job
    //       construct so users can identify the invoker function
    //       in the Console.
    const fn = new Function(this, this.node.id, {
      handler,
      nodejs: { format: "esm" },
      runtime: "nodejs16.x",
      timeout: 10,
      memorySize: 1024,
      environment: {
        SST_DEBUG_TYPE: "job",
      },
      permissions,
    });
    fn._doNotAllowOthersToBind = true;
    return fn;
  }

  private createCodeBuildInvoker(): Function {
    const fn = new Function(this, this.node.id, {
      handler: path.join(__dirname, "../support/job-invoker/index.main"),
      runtime: "nodejs18.x",
      timeout: 10,
      memorySize: 1024,
      environment: {
        PROJECT_NAME: this.job.projectName,
      },
      permissions: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["codebuild:StartBuild"],
          resources: [this.job.projectArn],
        }),
      ],
      nodejs: {
        format: "esm",
      },
      enableLiveDev: false,
    });
    fn._doNotAllowOthersToBind = true;
    return fn;
  }

  private bindForCodeBuild(constructs: SSTConstruct[]): void {
    // Get referenced secrets
    const referencedSecrets: Secret[] = [];
    constructs.forEach((c) =>
      referencedSecrets.push(...getReferencedSecrets(c))
    );

    [...constructs, ...referencedSecrets].forEach((c) => {
      // Bind environment
      const env = bindEnvironment(c);
      Object.entries(env).forEach(([key, value]) =>
        this.addEnvironmentForCodeBuild(key, value)
      );

      // Bind permissions
      const permissions = bindPermissions(c);
      Object.entries(permissions).forEach(([action, resources]) =>
        this.attachPermissionsForCodeBuild([
          new PolicyStatement({
            actions: [action],
            effect: Effect.ALLOW,
            resources,
          }),
        ])
      );
    });
  }

  private attachPermissionsForCodeBuild(permissions: Permissions): void {
    attachPermissionsToRole(this.job.role as Role, permissions);
  }

  private addEnvironmentForCodeBuild(name: string, value: string): void {
    const project = this.job.node.defaultChild as CfnProject;
    const env = project.environment as CfnProject.EnvironmentProperty;
    const envVars =
      env.environmentVariables as CfnProject.EnvironmentVariableProperty[];
    envVars.push({ name, value });
  }

  private normalizeMemorySize(memorySize: JobMemorySize): ComputeType {
    if (memorySize === "3 GB") {
      return ComputeType.SMALL;
    } else if (memorySize === "7 GB") {
      return ComputeType.MEDIUM;
    } else if (memorySize === "15 GB") {
      return ComputeType.LARGE;
    } else if (memorySize === "145 GB") {
      return ComputeType.X2_LARGE;
    }

    throw new Error(`Invalid memory size value for the ${this.node.id} Job.`);
  }

  private normalizeTimeout(timeout: Duration): CdkDuration {
    const value = toCdkDuration(timeout);
    if (value.toSeconds() < 5 * 60 || value.toSeconds() > 480 * 60) {
      throw new Error(`Invalid timeout value for the ${this.node.id} Job.`);
    }
    return value;
  }
}
