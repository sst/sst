import url from "url";
import path from "path";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import { Effect, Role, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  Architecture,
  Runtime,
  Code,
  FunctionOptions,
  Function as CdkFunction,
} from "aws-cdk-lib/aws-lambda";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Duration as CdkDuration, CustomResource } from "aws-cdk-lib";

import { useProject } from "../project.js";
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
  bundle: string;
  handler: string;
  runtime?: "nodejs14.x" | "nodejs16.x" | "nodejs18.x";
  timeout: number | Duration;
  memorySize: number | Size;
  permissions?: Permissions;
  environment?: Record<string, string>;
  bind?: SSTConstruct[];
}

/////////////////////
// Construct
/////////////////////

export class SsrFunction extends Construct {
  public function: CdkFunction;
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

    const asset = this.createCodeAsset();
    const assetReplacer = this.createCodeReplacer(asset);
    this.function = this.createFunction(asset);
    this.attachPermissions(props.permissions || []);
    this.bind(props.bind || []);

    this.function.node.addDependency(assetReplacer);
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.function.role as Role, permissions);
  }

  private createCodeAsset() {
    const { bundle } = this.props;

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
    return new Asset(this, "Asset", {
      path: path.join(outputPath, "server-function.zip"),
    });
  }

  private createFunction(asset: Asset) {
    const { runtime, timeout, memorySize, handler } = this.props;

    return new CdkFunction(this, `ServerFunction`, {
      ...this.props,
      handler,
      logRetention: RetentionDays.THREE_DAYS,
      code: Code.fromBucket(asset.bucket, asset.s3ObjectKey),
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
    });
  }

  private createCodeReplacer(asset: Asset) {
    const { environment } = this.props;

    // Note: Source code for the Lambda functions have "{{ ENV_KEY }}" in them.
    //       They need to be replaced with real values before the Lambda
    //       functions get deployed.
    const stack = Stack.of(this) as Stack;

    const policy = new Policy(this, "AssetReplacerPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:GetObject", "s3:PutObject"],
          resources: [`arn:${stack.partition}:s3:::${asset.s3BucketName}/*`],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);

    const resource = new CustomResource(this, "AssetReplacer", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AssetReplacer",
      properties: {
        bucket: asset.s3BucketName,
        key: asset.s3ObjectKey,
        replacements: Object.entries(environment).map(([key, value]) => ({
          files: "**/*.*js",
          search: `{{ ${key} }}`,
          replace: value,
        })),
      },
    });
    resource.node.addDependency(policy);

    return resource;
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
}
