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
  /**
   * The schedule for the cron job.
   *
   * The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).
   *
   * ```txt
   * rate(1 minute)
   * rate(5 minutes)
   * rate(1 hour)
   * rate(5 hours)
   * rate(1 day)
   * rate(5 days)
   * ```
   * Or as a [cron expression](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions).
   *
   * ```txt
   * cron(15 10 * * ? *)    // 10:15 AM (UTC) every day.
   * ```
   *
   * @example
   * ```js
   * new Job(stack, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "rate(5 minutes)",
   * });
   * ```
   * ```js
   * new Job(stack, "Cron", {
   *   job: "src/lambda.main",
   *   schedule: "cron(15 10 * * ? *)",
   * });
   * ```
   */
  schedule?: `rate(${string})` | `cron(${string})`;
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
  private readonly jobInvoker: Function;

  constructor(scope: Construct, id: string, props: JobProps) {
    super(scope, id);

    this.props = props;

    this.localId = path.posix
      .join(scope.node.path, id)
      .replace(/\$/g, "-")
      .replace(/\//g, "-")
      .replace(/\./g, "-");

    this.job = this.createCodeBuildProject();
    this.jobInvoker = this.createJobInvoker();
    this.buildCode();
    this.attachPermissions(props.permissions || []);
    this.addConfig(props.config || []);
  }

  /**
   * The job id.
   */
  public get jobID(): string {
    return this.job.projectArn;
  }

  private buildCode() {
    const {
      handler,
      srcPath: srcPathRaw,
      enableLiveDev: enableLiveDevRaw,
    } = this.props;
    const srcPath = Function.normalizeSrcPath(srcPathRaw || ".");
    const enableLiveDev = enableLiveDevRaw === false ? false : true;
    const bundle = { format: "esm" } as FunctionBundleNodejsProps;

    const app = this.node.root as App;

    // Handle local development (ie. sst start)
    if (enableLiveDev && app.local) {
      this.addEnvironment("SST_FUNCTION_ID", this.localId);
      this.addEnvironment("SST_DEBUG_SRC_PATH", srcPath);
      this.addEnvironment("SST_DEBUG_SRC_HANDLER", handler);
      this.addEnvironment("SST_DEBUG_ENDPOINT", app.debugEndpoint!);
      this.addEnvironment("SST_DEBUG_BUCKET_NAME", app.debugBucketName!);
      this.attachPermissions([
        new iam.PolicyStatement({
          actions: ["s3:*"],
          effect: iam.Effect.ALLOW,
          resources: [`${app.debugBucketArn}/*`],
        }),
      ]);

      const code = lambda.AssetCode.fromAsset(path.resolve(__dirname, "../assets/Job/stub"));
      this.updateCodeBuildProjectCode(code, "index.js");

      State.Function.append(app.appPath, {
        id: this.localId,
        handler,
        runtime: "nodejs16.x",
        srcPath,
        bundle,
      });
    }
    // Handle remove (ie. sst remove)
    else if (app.skipBuild) {
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
            `const result = await ${module}();`,
            `console.log(result);`,
          ].join("\n"));

          const code = lambda.AssetCode.fromAsset(bundled.directory);
          this.updateCodeBuildProjectCode(code, "handler-wrapper.js");
        }
      });
    }
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

  private async updateCodeBuildProjectCode(code: lambda.Code, script: string) {
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

  private createJobInvoker(): Function {
    new Function(this, "JobProjectInvoker", {
    })
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
    const app = this.node.root as App;

    // Add environment variables
    (config || []).forEach((c) => {
      if (c instanceof Secret) {
        this.addEnvironment(
          `${FunctionConfig.SECRET_ENV_PREFIX}${c.name}`,
          "1"
        );
      } else if (c instanceof Parameter) {
        this.addEnvironment(
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
      this.attachPermissions([
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
}