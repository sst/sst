import url from "url";
import path from "path";
import zlib from "zlib";
import fs from "fs/promises";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import {
  Effect,
  Role,
  Policy,
  PolicyStatement,
  CfnPolicy,
  IGrantable,
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
  FunctionUrlOptions,
} from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
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
import { Secret } from "./Config.js";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { SSTConstruct } from "./Construct.js";
import {
  ResourceBindingProp,
  bindEnvironment,
  bindPermissions,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { Size, toCdkSize } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { useDeferredTasks } from "./deferred_task.js";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Config } from "../config.js";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface SsrFunctionProps
  extends Omit<FunctionOptions, "memorySize" | "timeout" | "runtime"> {
  bundle?: string;
  handler: string;
  runtime?: "nodejs16.x" | "nodejs18.x" | "nodejs20.x";
  timeout?: number | Duration;
  memorySize?: number | Size;
  permissions?: Permissions;
  environment?: Record<string, string>;
  bind?: SSTConstruct[];
  nodejs?: NodeJSProps;
  copyFiles?: FunctionCopyFilesProps[];
  logRetention?: RetentionDays;
  streaming?: boolean;
  injections?: string[];
  prefetchSecrets?: boolean;
}

/////////////////////
// Construct
/////////////////////

export class SsrFunction extends Construct implements SSTConstruct {
  public readonly id: string;
  /** @internal */
  public readonly _doNotAllowOthersToBind = true;
  public function: CdkFunction;
  private assetReplacer: CustomResource;
  private assetReplacerPolicy: Policy;
  private missingSourcemap?: boolean;
  private props: SsrFunctionProps & {
    timeout: Exclude<SsrFunctionProps["timeout"], undefined>;
    memorySize: Exclude<SsrFunctionProps["memorySize"], undefined>;
    environment: Exclude<SsrFunctionProps["environment"], undefined>;
    permissions: Exclude<SsrFunctionProps["permissions"], undefined>;
    streaming: Exclude<SsrFunctionProps["streaming"], undefined>;
    injections: Exclude<SsrFunctionProps["injections"], undefined>;
  };

  constructor(scope: Construct, id: string, props: SsrFunctionProps) {
    super(scope, id);
    this.id = id;

    this.props = {
      timeout: 10,
      memorySize: 1024,
      streaming: false,
      injections: [],
      architecture: Architecture.ARM_64,
      ...props,
      environment: props.environment || {},
      permissions: props.permissions || [],
    };

    // Create function with placeholder code
    const assetBucket = "placeholder";
    const assetKey = "placeholder";
    const { assetReplacer, assetReplacerPolicy } = this.createCodeReplacer(
      assetBucket,
      assetKey
    );
    this.function = this.createFunction(assetBucket, assetKey);
    this.attachPermissions(props.permissions || []);
    this.bind(props.bind || []);
    this.function.node.addDependency(assetReplacer);
    this.createSecretPrefetcher();

    this.assetReplacer = assetReplacer;
    this.assetReplacerPolicy = assetReplacerPolicy;

    useDeferredTasks().add(async () => {
      const { bundle } = this.props;
      const { code, handler } = bundle
        ? await this.buildAssetFromBundle(bundle)
        : await this.buildAssetFromHandler();
      const codeConfig = code.bind(this.function);
      const assetBucket = codeConfig.s3Location?.bucketName!;
      const assetKey = codeConfig.s3Location?.objectKey!;
      this.updateCodeReplacer(assetBucket, assetKey);
      this.updateFunction(code, assetBucket, assetKey, handler);
    });

    const app = this.node.root as App;
    app.registerTypes(this);
  }

  public get role() {
    return this.function.role;
  }

  public get functionArn() {
    return this.function.functionArn;
  }

  public get functionName() {
    return this.function.functionName;
  }

  public addEnvironment(key: string, value: string) {
    return this.function.addEnvironment(key, value);
  }

  public addFunctionUrl(props?: FunctionUrlOptions) {
    return this.function.addFunctionUrl(props);
  }

  public grantInvoke(grantee: IGrantable) {
    return this.function.grantInvoke(grantee);
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.function.role as Role, permissions);
  }

  public _overrideMissingSourcemap() {
    this.missingSourcemap = true;
  }

  private createFunction(assetBucket: string, assetKey: string) {
    const {
      architecture,
      runtime,
      timeout,
      memorySize,
      handler,
      logRetention,
    } = this.props;

    return new CdkFunction(this, `ServerFunction`, {
      ...this.props,
      handler: handler.split(path.sep).join(path.posix.sep),
      logRetention: logRetention ?? RetentionDays.THREE_DAYS,
      code: Code.fromBucket(
        Bucket.fromBucketName(this, "IServerFunctionBucket", assetBucket),
        assetKey
      ),
      runtime:
        runtime === "nodejs20.x"
          ? Runtime.NODEJS_20_X
          : runtime === "nodejs16.x"
          ? Runtime.NODEJS_16_X
          : Runtime.NODEJS_18_X,
      architecture,
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

  private createSecretPrefetcher() {
    const { prefetchSecrets } = this.props;
    if (!prefetchSecrets) return;

    const stack = Stack.of(this) as Stack;

    // Create custom resource to prewarm on deploy
    const policy = new Policy(this, "SecretPrefetcherPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lambda:GetFunction", "lambda:UpdateFunctionConfiguration"],
          resources: [this.function.functionArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ssm:GetParameters"],
          resources: [
            `arn:${stack.partition}:ssm:${stack.region}:${stack.account}:parameter${Config.PREFIX.STAGE}*`,
            `arn:${stack.partition}:ssm:${stack.region}:${stack.account}:parameter${Config.PREFIX.FALLBACK}*`,
          ],
        }),
      ],
    });
    stack.customResourceHandler.role?.attachInlinePolicy(policy);
    const resource = new CustomResource(this, "SecretPrefetcher", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::SecretPrefetcher",
      properties: {
        version: Date.now().toString(),
        functionName: this.function.functionName,
      },
    });
    resource.node.addDependency(policy);
  }

  private bind(constructsProp: ResourceBindingProp): void {
    const app = this.node.root as App;
    this.function.addEnvironment("SST_APP", app.name);
    this.function.addEnvironment("SST_STAGE", app.stage);
    this.function.addEnvironment(
      "SST_SSM_PREFIX",
      useProject().config.ssmPrefix
    );

    // Set up so that all constructs has an empty overrides for permissions
    const cWithOverrides: {
      construct: SSTConstruct;
      permissions: string[];
    }[] = constructsProp.map((val) =>
      val instanceof Array
        ? { construct: val[0], permissions: val[1].permissions }
        : { construct: val, permissions: [] }
    );

    // Get referenced secrets
    const referencedSecrets: Secret[] = [];
    cWithOverrides.forEach((c) =>
      referencedSecrets.push(...getReferencedSecrets(c.construct))
    );

    [...cWithOverrides, ...referencedSecrets].forEach((p) => {
      const c = p instanceof Secret ? p : p.construct;
      const permissionsOverride = p instanceof Secret ? [] : p.permissions;
      // Bind environment
      const env = bindEnvironment(c);
      Object.entries(env).forEach(([key, value]) =>
        this.function.addEnvironment(key, value)
      );

      // Bind permissions
      const permissions = bindPermissions(c, permissionsOverride);
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

  private async buildAssetFromHandler() {
    const {
      handler,
      runtime,
      nodejs,
      copyFiles,
      architecture: enumArchitecture,
    } = this.props;
    const architecture =
      enumArchitecture === Architecture.X86_64 ? "x86_64" : "arm_64";

    useFunctions().add(this.node.addr, {
      handler,
      runtime,
      nodejs,
      architecture,
      copyFiles,
    });

    // build function
    const result = await useRuntimeHandlers().build(this.node.addr, "deploy");

    // create wrapper that calls the handler
    if (result.type === "error")
      throw new Error(
        [
          `There was a problem bundling the SSR function for the "${this.node.id}" Site.`,
          ...result.errors,
        ].join("\n")
      );

    const newHandler = await this.writeWrapperFile(result.out, result.handler);

    // upload sourcemap
    const stack = Stack.of(this) as Stack;
    if (result.sourcemap) {
      const data = await fs.readFile(result.sourcemap);
      await fs.writeFile(result.sourcemap, zlib.gzipSync(data));
      const asset = new Asset(this, "Sourcemap", {
        path: result.sourcemap,
      });
      await fs.rm(result.sourcemap);
      useFunctions().sourcemaps.add(stack.stackName, {
        asset,
        tarKey: this.functionArn,
      });
    }
    this.missingSourcemap = !result.sourcemap;

    return { code: AssetCode.fromAsset(result.out), handler: newHandler };
  }

  private async buildAssetFromBundle(bundle: string) {
    const { handler } = this.props;
    const newHandler = await this.writeWrapperFile(bundle, handler);

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

    return {
      code: AssetCode.fromAsset(path.join(outputPath, "server-function.zip")),
      handler: newHandler,
    };
  }

  private async writeWrapperFile(bundle: string, handler: string) {
    const { streaming, injections } = this.props;
    if (injections.length === 0) return handler;

    const {
      dir: handlerDir,
      name: oldHandlerName,
      ext: oldHandlerExt,
    } = path.posix.parse(handler);
    const oldHandlerFunction = oldHandlerExt.replace(/^\./, "");
    const newHandlerName = "server-index";
    const newHandlerFunction = "handler";
    await fs.writeFile(
      path.join(bundle, handlerDir, `${newHandlerName}.mjs`),
      streaming
        ? [
            `export const ${newHandlerFunction} = awslambda.streamifyResponse(async (event, context) => {`,
            ...injections,
            `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerName}.mjs");`,
            `  return rawHandler(event, context);`,
            `});`,
          ].join("\n")
        : [
            `export const ${newHandlerFunction} = async (event, context) => {`,
            ...injections,
            `  const { ${oldHandlerFunction}: rawHandler} = await import("./${oldHandlerName}.mjs");`,
            `  return rawHandler(event, context);`,
            `};`,
          ].join("\n")
    );
    return path.posix.join(
      handlerDir,
      `${newHandlerName}.${newHandlerFunction}`
    );
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

  private updateFunction(
    code: Code,
    assetBucket: string,
    assetKey: string,
    handler: string
  ) {
    const cfnFunction = this.function.node.defaultChild as CfnFunction;
    cfnFunction.handler = handler;
    cfnFunction.code = {
      s3Bucket: assetBucket,
      s3Key: assetKey,
    };
    code.bindToResource(cfnFunction);
  }

  /** @internal */
  public getConstructMetadata() {
    return {
      type: "Function" as const,
      data: {
        arn: this.functionArn,
        runtime: this.props.runtime,
        handler: this.props.handler,
        missingSourcemap: this.missingSourcemap === true ? true : undefined,
        localId: this.node.addr,
        secrets: [] as string[],
        prefetchSecrets: this.props.prefetchSecrets,
      },
    };
  }

  /** @internal */
  public getFunctionBinding() {
    return undefined;
  }
}
