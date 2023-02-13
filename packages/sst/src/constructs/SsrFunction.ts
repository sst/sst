import url from "url";
import path from "path";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import { Effect, Role, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import { Duration as CdkDuration, CustomResource } from "aws-cdk-lib";

import { Stack } from "./Stack.js";
import { BaseSiteReplaceProps } from "./BaseSite.js";
import { useProject } from "../project.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { Size, toCdkSize } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { FunctionOptions } from "aws-cdk-lib/aws-lambda";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface SsrFunctionProps
  extends Omit<FunctionOptions, "memorySize" | "timeout" | "runtime"> {
  bundlePath: string;
  handler: string;
  runtime?: "nodejs14.x" | "nodejs16.x" | "nodejs18.x";
  timeout: number | Duration;
  memorySize: number | Size;
  permissions?: Permissions;
}

/////////////////////
// Construct
/////////////////////

export class SsrFunction extends Construct {
  public function: lambda.Function;
  private props: SsrFunctionProps;

  constructor(scope: Construct, id: string, props: SsrFunctionProps) {
    super(scope, id);

    this.props = props;
    const { permissions } = props;

    this.function = this.createFunction();
    this.attachPermissions(permissions || []);
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.function.role as Role, permissions);
  }

  private createFunction() {
    const { runtime, timeout, memorySize, handler, bundlePath } = this.props;

    // Note: cannot point the bundlePath to the `.open-next/server-function`
    //       b/c the folder contains node_modules. And pnpm node_modules
    //       contains symlinks. CDK cannot zip symlinks correctly.
    //       https://github.com/aws/aws-cdk/issues/9251
    //       We will zip the folder ourselves.
    const zipOutDir = path.resolve(
      useProject().paths.artifacts,
      `Site-${this.node.id}-${this.node.addr}`
    );
    const script = path.resolve(
      __dirname,
      "../support/ssr-site-function-archiver.mjs"
    );
    const result = spawn.sync(
      "node",
      [
        script,
        path.join(bundlePath),
        path.join(zipOutDir, "server-function.zip"),
      ],
      { stdio: "inherit" }
    );
    if (result.status !== 0) {
      throw new Error(`There was a problem generating the assets package.`);
    }

    // Create asset
    const asset = new s3Assets.Asset(this, "Asset", {
      path: path.join(zipOutDir, "server-function.zip"),
    });

    // Deploy after the code is updated
    const replacer = this.createLambdaCodeReplacer(asset);

    const fn = new lambda.Function(this, `ServerFunction`, {
      ...this.props,
      handler,
      logRetention: logs.RetentionDays.THREE_DAYS,
      code: lambda.Code.fromBucket(asset.bucket, asset.s3ObjectKey),
      runtime:
        runtime === "nodejs14.x"
          ? lambda.Runtime.NODEJS_14_X
          : runtime === "nodejs16.x"
          ? lambda.Runtime.NODEJS_16_X
          : lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize:
        typeof memorySize === "string"
          ? toCdkSize(memorySize).toMebibytes()
          : memorySize,
      timeout:
        typeof timeout === "string"
          ? toCdkDuration(timeout)
          : CdkDuration.seconds(timeout),
    });
    fn.node.addDependency(replacer);

    return fn;
  }

  private createLambdaCodeReplacer(asset: s3Assets.Asset): CustomResource {
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
        replacements: this.getLambdaContentReplaceValues(),
      },
    });
    resource.node.addDependency(policy);

    return resource;
  }

  private getLambdaContentReplaceValues() {
    const replaceValues: BaseSiteReplaceProps[] = [];

    Object.entries(this.props.environment || {}).forEach(([key, value]) => {
      const token = `{{ ${key} }}`;
      replaceValues.push(
        {
          files: "**/*.js",
          search: token,
          replace: value,
        },
        {
          files: "**/*.cjs",
          search: token,
          replace: value,
        },
        {
          files: "**/*.mjs",
          search: token,
          replace: value,
        }
      );
    });

    return replaceValues;
  }
}
