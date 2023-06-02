import url from "url";
import path from "path";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import {
  Effect,
  Role,
  Policy,
  PolicyStatement,
  CfnPolicy,
} from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  Architecture,
  AssetCode,
  Runtime,
  CfnFunction,
  Code,
  FunctionOptions,
  Function as CdkFunction,
} from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import {
  Duration as CdkDuration,
  CustomResource,
  CfnCustomResource,
} from "aws-cdk-lib/core";

import { useProject } from "../project.js";
import { useRuntimeHandlers } from "../runtime/handlers.js";
import {
  useFunctions,
  NodeJSProps,
  FunctionCopyFilesProps,
} from "./Function.js";
import { useDeferredTasks } from "./deferred_task.js";
import { Secret } from "./Config.js";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { SSTConstruct } from "./Construct.js";
import {
  bindEnvironment,
  bindPermissions,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { Size, toCdkSize } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface SsrFunctionProps
  extends Omit<FunctionOptions, "memorySize" | "timeout" | "runtime"> {
  bundle?: string;
  handler: string;
  runtime?: "nodejs14.x" | "nodejs16.x" | "nodejs18.x";
  timeout: number | Duration;
  memorySize: number | Size;
  permissions?: Permissions;
  environment?: Record<string, string>;
  bind?: SSTConstruct[];
  nodejs?: NodeJSProps;
  copyFiles?: FunctionCopyFilesProps[];
  logRetention?: RetentionDays;
}

/////////////////////
// Construct
/////////////////////

export class SsrFunction extends Construct {
  public function: CdkFunction;
  private assetReplacer: CustomResource;
  private assetReplacerPolicy: Policy;
  private props: SsrFunctionProps & {
    environment: Exclude<SsrFunctionProps["environment"], undefined>;
    permissions: Exclude<SsrFunctionProps["permissions"], undefined>;
  };

  constructor(scope: Construct, id: string, props: SsrFunctionProps) {
    super(scope, id);

    this.props = {
      ...props,
      environment: props.environment || {},
      permissions: props.permissions || [],
    };

    const { assetBucket, assetKey } = (
      props.bundle
        ? // Case: bundle is pre-built
          () => {
            const asset = this.buildAssetFromBundle(props.bundle!);
            return {
              assetBucket: asset.s3BucketName,
              assetKey: asset.s3ObjectKey,
            };
          }
        : // Case: bundle is NOT pre-built
          () => {
            this.buildAssetFromHandler((code) => {
              const codeConfig = code.bind(this.function);
              const assetBucket = codeConfig.s3Location?.bucketName!;
              const assetKey = codeConfig.s3Location?.objectKey!;
              this.updateCodeReplacer(assetBucket, assetKey);
              this.updateFunction(code, assetBucket, assetKey);
            });
            return {
              assetBucket: "placeholder",
              assetKey: "placeholder",
            };
          }
    )();

    const { assetReplacer, assetReplacerPolicy } = this.createCodeReplacer(
      assetBucket,
      assetKey
    );
    this.function = this.createFunction(assetBucket, assetKey);
    this.attachPermissions(props.permissions || []);
    this.bind(props.bind || []);

    // Create function after the code is updated
    this.function.node.addDependency(assetReplacer);

    this.assetReplacer = assetReplacer;
    this.assetReplacerPolicy = assetReplacerPolicy;
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.function.role as Role, permissions);
  }

  private createFunction(assetBucket: string, assetKey: string) {
    const { runtime, timeout, memorySize, handler, logRetention } = this.props;

    return new CdkFunction(this, `ServerFunction`, {
      ...this.props,
      handler: handler.split(path.sep).join(path.posix.sep),
      logRetention: logRetention ?? RetentionDays.THREE_DAYS,
      code: Code.fromBucket(
        Bucket.fromBucketName(this, "IServerFunctionBucket", assetBucket),
        assetKey
      ),
      runtime:
        runtime === "nodejs14.x"
          ? Runtime.NODEJS_14_X
          : runtime === "nodejs16.x"
          ? Runtime.NODEJS_16_X
          : Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      memorySize:
        typeof memorySize === "string"
          ? toCdkSize(memorySize).toMebibytes()
          : memorySize,
      timeout:
        typeof timeout === "string"
          ? toCdkDuration(timeout)
          : CdkDuration.seconds(timeout),
      logRetentionRetryOptions: logRetention && { maxRetries: 100 },
    });
  }

  private createCodeReplacer(assetBucket: string, assetKey: string) {
    const { environment } = this.props;

    // Note: Source code for the Lambda functions have "{{ ENV_KEY }}" in them.
    //       They need to be replaced with real values before the Lambda
    //       functions get deployed.
    // - "*.js" files: ie. Next.js server function
    // - "*.html" files: ie. SvelteKit prerendered pages data
    // - "*.json" files: ie. SvelteKit prerendered + SSR data
    const stack = Stack.of(this) as Stack;

    const policy = new Policy(this, "AssetReplacerPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject", "s3:PutObject"],
          resources: [`arn:${stack.partition}:s3:::${assetBucket}/*`],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);

    const resource = new CustomResource(this, "AssetReplacer", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AssetReplacer",
      properties: {
        bucket: assetBucket,
        key: assetKey,
        replacements: Object.entries(environment).map(([key, value]) => ({
          files: "**/*.@(*js|json|html)",
          search: `{{ ${key} }}`,
          replace: value,
        })),
      },
    });
    resource.node.addDependency(policy);

    return { assetReplacer: resource, assetReplacerPolicy: policy };
  }

  private bind(constructs: SSTConstruct[]): void {
    const app = this.node.root as App;
    this.function.addEnvironment("SST_APP", app.name);
    this.function.addEnvironment("SST_STAGE", app.stage);
    this.function.addEnvironment(
      "SST_SSM_PREFIX",
      useProject().config.ssmPrefix
    );

    // Get referenced secrets
    const referencedSecrets: Secret[] = [];
    constructs.forEach((c) =>
      referencedSecrets.push(...getReferencedSecrets(c))
    );

    [...constructs, ...referencedSecrets].forEach((c) => {
      // Bind environment
      const env = bindEnvironment(c);
      Object.entries(env).forEach(([key, value]) =>
        this.function.addEnvironment(key, value)
      );

      // Bind permissions
      const permissions = bindPermissions(c);
      Object.entries(permissions).forEach(([action, resources]) =>
        this.attachPermissions([
          new PolicyStatement({
            actions: [action],
            effect: Effect.ALLOW,
            resources,
          }),
        ])
      );
    });
  }

  private buildAssetFromHandler(onBundled: (code: Code) => void) {
    useFunctions().add(this.node.addr, {
      handler: this.props.handler,
      runtime: this.props.runtime,
      nodejs: this.props.nodejs,
      copyFiles: this.props.copyFiles,
    });

    useDeferredTasks().add(async () => {
      // Build function
      const bundle = await useRuntimeHandlers().build(this.node.addr, "deploy");

      // create wrapper that calls the handler
      if (bundle.type === "error")
        throw new Error(
          [
            `There was a problem bundling the SSR function for the "${this.node.id}" Site.`,
            ...bundle.errors,
          ].join("\n")
        );

      const code = AssetCode.fromAsset(bundle.out);

      onBundled(code);
    });
  }

  private buildAssetFromBundle(bundle: string) {
    // Note: cannot point the bundle to the `.open-next/server-function`
    //       b/c the folder contains node_modules. And pnpm node_modules
    //       contains symlinks. CDK cannot zip symlinks correctly.
    //       https://github.com/aws/aws-cdk/issues/9251
    //       We will zip the folder ourselves.
    const outputPath = path.resolve(
      useProject().paths.artifacts,
      `SsrFunction-${this.node.id}-${this.node.addr}`
    );
    const script = path.resolve(
      __dirname,
      "../support/ssr-site-function-archiver.mjs"
    );
    const result = spawn.sync(
      "node",
      [script, path.join(bundle), path.join(outputPath, "server-function.zip")],
      { stdio: "inherit" }
    );
    if (result.status !== 0) {
      throw new Error(`There was a problem generating the assets package.`);
    }

    // Create asset
    return new Asset(this, `FunctionAsset`, {
      path: path.join(outputPath, "server-function.zip"),
    });
  }

  private updateCodeReplacer(assetBucket: string, assetKey: string) {
    const stack = Stack.of(this) as Stack;

    const cfnReplacer = this.assetReplacer.node
      .defaultChild as CfnCustomResource;
    cfnReplacer.addPropertyOverride("bucket", assetBucket);
    cfnReplacer.addPropertyOverride("key", assetKey);

    const cfnPolicy = this.assetReplacerPolicy.node.defaultChild as CfnPolicy;
    cfnPolicy.addPropertyOverride(
      "PolicyDocument.Statement.0.Resource",
      `arn:${stack.partition}:s3:::${assetBucket}/*`
    );
  }

  private updateFunction(code: Code, assetBucket: string, assetKey: string) {
    const cfnFunction = this.function.node.defaultChild as CfnFunction;
    cfnFunction.code = {
      s3Bucket: assetBucket,
      s3Key: assetKey,
    };
    code.bindToResource(cfnFunction);
  }
}
