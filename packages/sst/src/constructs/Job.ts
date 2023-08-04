import url from "url";
import path from "path";
import fs from "fs/promises";
import { Construct } from "constructs";
import { Duration as CdkDuration } from "aws-cdk-lib/core";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import { PolicyStatement, Role, Effect } from "aws-cdk-lib/aws-iam";
import {
  AssetCode,
  Code,
  Runtime,
  Function as CdkFunction,
} from "aws-cdk-lib/aws-lambda";
import {
  Project,
  CfnProject,
  LinuxBuildImage,
  BuildSpec,
  ComputeType,
} from "aws-cdk-lib/aws-codebuild";
import { RetentionDays, LogRetention } from "aws-cdk-lib/aws-logs";

import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Secret } from "./Config.js";
import { SSTConstruct } from "./Construct.js";
import {
  Function,
  useFunctions,
  NodeJSProps,
  FunctionCopyFilesProps,
} from "./Function.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import {
  FunctionBindingProps,
  bindEnvironment,
  bindPermissions,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { ISecurityGroup, IVpc, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import { useDeferredTasks } from "./deferred_task.js";
import { useProject } from "../project.js";
import { useRuntimeHandlers } from "../runtime/handlers.js";
import { Colors } from "../cli/colors.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export type JobMemorySize = "3 GB" | "7 GB" | "15 GB" | "145 GB";
export interface JobNodeJSProps extends NodeJSProps {}
export interface JobContainerProps {
  /**
   * Specify or override the CMD on the Docker image.
   * @example
   * ```js
   * container: {
   *   cmd: ["python3", "my_script.py"]
   * }
   * ```
   */
  cmd: string[];
  /**
   * Name of the Dockerfile.
   * @example
   * ```js
   * container: {
   *   file: "path/to/Dockerfile.prod"
   * }
   * ```
   */
  file?: string;
}

export interface JobProps {
  /**
   * The CPU architecture of the job.
   * @default "x86_64"
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   architecture: "arm_64",
   *   handler: "src/job.handler",
   * })
   * ```
   */
  architecture?: "x86_64" | "arm_64";
  /**
   * The runtime environment for the job.
   * @default "nodejs"
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   runtime: "container",
   *   handler: "src/job",
   * })
   *```
   */
  runtime?: "nodejs" | "container";
  /**
   * For "nodejs" runtime, point to the entry point and handler function.
   * Of the format: `/path/to/file.function`.
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   * })
   *```
   *
   * For "container" runtime, point the handler to the directory containing
   * the Dockerfile.
   *
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   runtime: "container",
   *   handler: "src/job", // Dockerfile is at "src/job/Dockerfile"
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
   * Used to configure additional files to copy into the function bundle
   *
   * @example
   * ```js
   * new Job(stack, "job", {
   *   copyFiles: [{ from: "src/index.js" }]
   * })
   *```
   */
  copyFiles?: FunctionCopyFilesProps[];
  /**
   * Used to configure nodejs function properties
   */
  nodejs?: JobNodeJSProps;
  /**
   * Used to configure container properties
   */
  container?: JobContainerProps;
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
  /**
   * The duration logs are kept in CloudWatch Logs.
   * @default Logs retained indefinitely
   * @example
   * ```js
   * new Job(stack, "MyJob", {
   *   handler: "src/job.handler",
   *   logRetention: "one_week"
   * })
   * ```
   */
  logRetention?: Lowercase<keyof typeof RetentionDays>;
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
    /**
     * Where to place the network interfaces within the VPC.
     * @default All private subnets.
     * @example
     * ```js
     * import { SubnetType } from "aws-cdk-lib/aws-ec2";
     *
     * new Job(stack, "MyJob", {
     *   handler: "src/job.handler",
     *   cdk: {
     *     vpc,
     *     vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS }
     *   }
     * })
     * ```
     */
    vpcSubnets?: SubnetSelection;
    /**
     * The list of security groups to associate with the Job's network interfaces.
     * @default A new security group is created.
     * @example
     * ```js
     * import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
     *
     * new Job(stack, "MyJob", {
     *   handler: "src/job.handler",
     *   cdk: {
     *     vpc,
     *     securityGroups: [
     *       new SecurityGroup(stack, "MyJobSG", { vpc })
     *     ]
     *   }
     * })
     * ```
     */
    securityGroups?: ISecurityGroup[];
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
 * import { Cron } from "sst/constructs";
 *
 * new Cron(stack, "Cron", {
 *   schedule: "rate(1 minute)",
 *   job: "src/lambda.main",
 * });
 * ```
 */
export class Job extends Construct implements SSTConstruct {
  public readonly id: string;
  private readonly props: JobProps;
  private readonly job: Project;
  private readonly liveDevJob?: Function;
  public readonly _jobManager: CdkFunction;

  constructor(scope: Construct, id: string, props: JobProps) {
    super(scope, props.cdk?.id || id);

    const app = this.node.root as App;
    const stack = Stack.of(scope) as Stack;
    this.id = id;
    this.props = props;
    const isLiveDevEnabled =
      app.mode === "dev" && (this.props.enableLiveDev === false ? false : true);

    this.validateContainerProps();
    this.validateMemoryProps();

    this.job = this.createCodeBuildJob();
    if (!stack.isActive) {
      this._jobManager = this.createJobManager();
    } else if (isLiveDevEnabled) {
      this.liveDevJob = this.createLiveDevJob();
      this._jobManager = this.createJobManager();
    } else {
      this._jobManager = this.createJobManager();
      this.buildCodeBuildProjectCode();
    }

    this.createLogRetention();
    this.attachPermissions(props.permissions || []);
    this.bind(props.bind || []);
    Object.entries(props.environment || {}).forEach(([key, value]) => {
      this.addEnvironment(key, value);
    });

    useFunctions().add(this.node.addr, {
      ...props,
      runtime: this.convertJobRuntimeToFunctionRuntime(),
    });
  }

  public getConstructMetadata() {
    return {
      type: "Job" as const,
      data: {
        handler: this.props.handler,
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    return {
      clientPackage: "job",
      variables: {
        functionName: {
          type: "plain",
          value: this._jobManager.functionName,
        },
      },
      permissions: {
        "lambda:*": [this._jobManager.functionArn],
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
    this.liveDevJob?.bind(constructs);
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
    this.liveDevJob?.attachPermissions(permissions);
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
    this.liveDevJob?.addEnvironment(name, value);
    this.addEnvironmentForCodeBuild(name, value);
  }

  private createCodeBuildJob(): Project {
    const { cdk, runtime, handler, memorySize, timeout, container } =
      this.props;
    const app = this.node.root as App;

    return new Project(this, "JobProject", {
      projectName: app.logicalPrefixedName(this.node.id),
      environment: {
        computeType: this.normalizeMemorySize(memorySize || "3 GB"),
      },
      environmentVariables: {
        SST_APP: { value: app.name },
        SST_STAGE: { value: app.stage },
        SST_SSM_PREFIX: { value: useProject().config.ssmPrefix },
      },
      timeout: this.normalizeTimeout(timeout || "8 hours"),
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
      vpc: cdk?.vpc,
      securityGroups: cdk?.securityGroups,
      subnetSelection: cdk?.vpcSubnets,
    });
  }

  private createLiveDevJob(): Function {
    // Note: make the invoker function the same ID as the Job
    //       construct so users can identify the invoker function
    //       in the Console.
    const fn = new Function(this, this.node.id, {
      ...this.props,
      runtime: this.convertJobRuntimeToFunctionRuntime(),
      memorySize: 1024,
      timeout: "10 seconds",
      environment: {
        ...this.props.environment,
        SST_DEBUG_JOB: "true",
      },
    });
    fn._doNotAllowOthersToBind = true;
    return fn;
  }

  private createLogRetention() {
    const { logRetention } = this.props;
    if (!logRetention) return;

    new LogRetention(this, "LogRetention", {
      logGroupName: `/aws/codebuild/${this.job.projectName}`,
      retention:
        RetentionDays[logRetention.toUpperCase() as keyof typeof RetentionDays],
      logRetentionRetryOptions: {
        maxRetries: 100,
      },
    });
  }

  private buildCodeBuildProjectCode() {
    const { handler, architecture, runtime, container } = this.props;

    useDeferredTasks().add(async () => {
      if (runtime === "container")
        Colors.line(
          `➜  Building the container image for the "${this.node.id}" job...`
        );

      // Build function
      const result = await useRuntimeHandlers().build(this.node.addr, "deploy");
      if (result.type === "error") {
        throw new Error(
          [`Failed to build job "${handler}"`, ...result.errors].join("\n")
        );
      }

      // No need to update code for container runtime
      // Note: we could set the commands in `createCodeBuildJob` but
      //       in `sst dev`, we want to avoid changing the CodeBuild resources
      //       when `cmd` changes.
      if (runtime === "container") {
        const image = LinuxBuildImage.fromAsset(this, "ContainerImage", {
          directory: handler,
          platform:
            architecture === "arm_64"
              ? Platform.custom("linux/arm64")
              : Platform.custom("linux/amd64"),
          file: container?.file,
        });
        image.repository?.grantPull(this.job.role!);
        const project = this.job.node.defaultChild as CfnProject;
        project.environment = {
          ...project.environment,
          type: architecture === "arm_64" ? "ARM_CONTAINER" : "LINUX_CONTAINER",
          image: image.imageId,
          imagePullCredentialsType: "SERVICE_ROLE",
        };
        project.source = {
          type: "NO_SOURCE",
          buildSpec: [
            "version: 0.2",
            "phases:",
            "  build:",
            "    commands:",
            `      - ${container!.cmd
              .map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))
              .join(" ")}`,
          ].join("\n"),
        };
        return;
      }

      // Create wrapper that calls the handler
      const parsed = path.parse(result.handler);
      const importName = parsed.ext.substring(1);
      const importPath = `./${path
        .join(parsed.dir, parsed.name)
        .split(path.sep)
        .join(path.posix.sep)}.mjs`;
      await fs.writeFile(
        path.join(result.out, "handler-wrapper.mjs"),
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
          `process.exit(0)`,
        ].join("\n")
      );

      // Update job's commands
      const code = AssetCode.fromAsset(result.out);
      const codeConfig = code.bind(this);
      const project = this.job.node.defaultChild as CfnProject;
      const image = LinuxBuildImage.fromDockerRegistry(
        // ARM images can be found here https://hub.docker.com/r/amazon/aws-lambda-nodejs
        architecture === "arm_64"
          ? "amazon/aws-lambda-nodejs:16.2023.07.13.14"
          : "amazon/aws-lambda-nodejs:16"
      );
      project.environment = {
        ...project.environment,
        type: architecture === "arm_64" ? "ARM_CONTAINER" : "LINUX_CONTAINER",
        image: image.imageId,
      };
      image.repository?.grantPull(this.job.role!);
      project.source = {
        type: "S3",
        location: `${codeConfig.s3Location?.bucketName}/${codeConfig.s3Location?.objectKey}`,
        buildSpec: [
          "version: 0.2",
          "phases:",
          "  build:",
          "    commands:",
          `      - node handler-wrapper.mjs`,
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
    });
  }

  private createJobManager(): CdkFunction {
    return new CdkFunction(this, "Manager", {
      code: Code.fromAsset(path.join(__dirname, "../support/job-manager/")),
      handler: "index.handler",
      runtime: Runtime.NODEJS_16_X,
      timeout: CdkDuration.seconds(10),
      memorySize: 1024,
      environment: {
        SST_JOB_PROVIDER: this.liveDevJob ? "lambda" : "codebuild",
        SST_JOB_RUNNER: this.liveDevJob
          ? this.liveDevJob.functionArn
          : this.job.projectName,
      },
      initialPolicy: [
        this.liveDevJob
          ? new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["lambda:InvokeFunction"],
              resources: [this.liveDevJob.functionArn],
            })
          : new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ["codebuild:StartBuild", "codebuild:StopBuild"],
              resources: [this.job.projectArn],
            }),
      ],
    });
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

  private validateContainerProps() {
    const { runtime, container } = this.props;
    if (runtime === "container") {
      if (!container) {
        throw new Error(`No commands defined for the ${this.node.id} Job.`);
      }
    }
  }

  private validateMemoryProps() {
    const { architecture, memorySize } = this.props;
    if (architecture === "arm_64") {
      if (memorySize === "7 GB" || memorySize === "145 GB") {
        throw new Error(
          `ARM architecture only supports "3 GB" and "15 GB" memory sizes for the ${this.node.id} Job.`
        );
      }
    }
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

  private convertJobRuntimeToFunctionRuntime() {
    const { runtime } = this.props;
    return runtime === "container" ? "container" : "nodejs16.x";
  }
}
