import fs from "fs";
import url from "url";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import spawn from "cross-spawn";
import { Construct, IConstruct } from "constructs";
import {
  Effect,
  Role,
  Policy,
  PolicyStatement,
  CompositePrincipal,
  ServicePrincipal,
  ManagedPolicy,
  CfnPolicy,
} from "aws-cdk-lib/aws-iam";
import {
  Version,
  IVersion,
  Code,
  Runtime,
  Function as CdkFunction,
  IFunction as CdkIFunction,
} from "aws-cdk-lib/aws-lambda";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import {
  Lazy,
  Duration as CdkDuration,
  CfnResource,
  CustomResource,
  CfnCustomResource,
} from "aws-cdk-lib/core";

import { useProject } from "../project.js";
import { useRuntimeHandlers } from "../runtime/handlers.js";
import { BaseSiteReplaceProps } from "./BaseSite.js";
import { SSTConstruct } from "./Construct.js";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Secret } from "./Config.js";
import { useFunctions, NodeJSProps } from "./Function.js";
import {
  bindEnvironment,
  bindPermissions,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { Size, toCdkSize } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
import { useDeferredTasks } from "./deferred_task.js";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface EdgeFunctionProps {
  bundle?: string;
  handler: string;
  runtime?: "nodejs14.x" | "nodejs16.x" | "nodejs18.x";
  timeout?: number | Duration;
  memorySize?: number | Size;
  permissions?: Permissions;
  environment?: Record<string, string>;
  bind?: SSTConstruct[];
  nodejs?: NodeJSProps;
  scopeOverride?: IConstruct;
}

/////////////////////
// Construct
/////////////////////

export class EdgeFunction extends Construct {
  public role: Role;
  public functionArn: string;
  public function: CdkIFunction;
  public currentVersion: IVersion;
  private functionCR: CustomResource;
  private assetReplacer: CustomResource;
  private assetReplacerPolicy: Policy;
  private scope: IConstruct;
  private bindingEnvs: Record<string, string>;
  private props: EdgeFunctionProps & {
    runtime: Exclude<EdgeFunctionProps["runtime"], undefined>;
    timeout: Exclude<EdgeFunctionProps["timeout"], undefined>;
    memorySize: Exclude<EdgeFunctionProps["memorySize"], undefined>;
    environment: Exclude<EdgeFunctionProps["environment"], undefined>;
    permissions: Exclude<EdgeFunctionProps["permissions"], undefined>;
  };

  constructor(scope: Construct, id: string, props: EdgeFunctionProps) {
    super(scope, id);

    // Override scope
    // note: this is intended to be used internally by SST to make constructs
    //       backwards compatible when the hirechical structure of the constructs
    //       changes. When the hirerchical structure changes, the child AWS
    //       resources' logical ID will change. And CloudFormation will recreate
    //       them.
    this.scope = props.scopeOverride || this;

    this.props = {
      ...props,
      runtime: "nodejs18.x",
      timeout: 10,
      memorySize: 1024,
      environment: props.environment || {},
      permissions: props.permissions || [],
    };

    // Bind first b/c function's environment variables cannot be added after
    this.bindingEnvs = {};
    this.bind(props.bind || []);

    // Create function with placeholder code
    const assetBucket = "placeholder";
    const assetKey = "placeholder";
    const handlerFilename = "placeholder";
    const { assetReplacer, assetReplacerPolicy } = this.createCodeReplacer(
      assetBucket,
      assetKey,
      handlerFilename
    );
    this.role = this.createRole();
    const lambdaBucket = this.createSingletonBucketInUsEast1();
    const { fn, fnArn } = this.createFunctionInUsEast1(
      assetBucket,
      assetKey,
      lambdaBucket
    );
    const { versionId } = this.createVersionInUsEast1(fn, fnArn);
    fn.node.addDependency(assetReplacer);

    this.function = CdkFunction.fromFunctionAttributes(
      this.scope,
      "ICdkFunction",
      {
        functionArn: fnArn,
        role: this.role,
      }
    );
    this.functionCR = fn;
    this.functionArn = fnArn;
    this.currentVersion = Version.fromVersionArn(
      this,
      `${id}FunctionVersion`,
      `${fnArn}:${versionId}`
    );
    this.assetReplacer = assetReplacer;
    this.assetReplacerPolicy = assetReplacerPolicy;

    useDeferredTasks().add(async () => {
      const { bundle, handler } = props;
      const { asset, handlerFilename } = bundle
        ? await this.buildAssetFromBundle(bundle, handler)
        : await this.buildAssetFromHandler();

      this.updateCodeReplacer(
        asset.s3BucketName,
        asset.s3ObjectKey,
        handlerFilename
      );
      this.updateFunctionInUsEast1(asset.s3BucketName, asset.s3ObjectKey);
    });
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.role, permissions);
  }

  public addEnvironment(key: string, value: string) {
    // Note: addEnvironment currently only updates AssetReplacer's
    //       "_SST_FUNCTION_ENVIRONMENT_" replacements
    this.props.environment[key] = value;

    const cfnReplacer = this.assetReplacer.node
      .defaultChild as CfnCustomResource;
    cfnReplacer.addPropertyOverride(
      "replacements.0.replace",
      JSON.stringify({
        ...this.props.environment,
        ...this.bindingEnvs,
      })
    );
  }

  private async buildAssetFromHandler() {
    const { nodejs } = this.props;

    useFunctions().add(this.node.addr, {
      ...this.props,
      nodejs: {
        ...nodejs,
        banner: [
          `process.env = { ...process.env, ..."{{ _SST_FUNCTION_ENVIRONMENT_ }}" };`,
          nodejs?.banner || "",
        ].join("\n"),
      },
    });

    // Build function
    const result = await useRuntimeHandlers().build(this.node.addr, "deploy");

    // create wrapper that calls the handler
    if (result.type === "error")
      throw new Error(
        [
          `There was a problem bundling the SSR function for the "${this.scope.node.id}" Site.`,
          ...result.errors,
        ].join("\n")
      );

    // upload sourcemap
    const stack = Stack.of(this) as Stack;
    if (result.sourcemap) {
      const data = await fs.promises.readFile(result.sourcemap);
      await fs.promises.writeFile(result.sourcemap, zlib.gzipSync(data));
      const asset = new Asset(this, "Sourcemap", {
        path: result.sourcemap,
      });
      await fs.promises.rm(result.sourcemap);
      useFunctions().sourcemaps.add(stack.stackName, {
        srcBucket: asset.bucket,
        srcKey: asset.s3ObjectKey,
        tarKey: this.functionArn,
      });
    }

    const asset = new Asset(this.scope, `FunctionAsset`, {
      path: result.out,
    });

    // Get handler filename
    const isESM = (nodejs?.format || "esm") === "esm";
    const parsed = path.parse(result.handler);
    const handlerFilename = `${parsed.dir}/${parsed.name}${
      isESM ? ".mjs" : ".cjs"
    }`;
    return { asset, handlerFilename };
  }

  private async buildAssetFromBundle(bundle: string, handler: string) {
    // We expose an environment variable token which is used by the code
    // replacer to inject the environment variables assigned to the
    // EdgeFunction construct.
    //
    // "{{ _SST_FUNCTION_ENVIRONMENT_ }}" will get replaced during
    // deployment with an object of environment key-value pairs, ie.
    // const environment = {"API_URL": "https://api.example.com"};
    //
    // This inlining strategy is required as Lambda@Edge doesn't natively
    // support runtime environment variables. A downside of this approach
    // is that environment variables cannot be toggled after deployment,
    // each change to one requires a redeployment.

    const {
      dir: inputPath,
      name: inputFilename,
      ext: inputHandlerFunction,
    } = path.parse(handler);
    const inputFileExt = this.getHandlerExtension(
      path.join(bundle, inputPath, inputFilename)
    );
    const handlerFilename = handler.replace(inputHandlerFunction, inputFileExt);
    const filePath = path.join(bundle, handlerFilename);
    const fileData = fs.readFileSync(filePath, "utf8");
    fs.writeFileSync(
      filePath,
      `process.env = { ...process.env, ..."{{ _SST_FUNCTION_ENVIRONMENT_ }}" };\n${fileData}`
    );

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
    const asset = new Asset(this.scope, `FunctionAsset`, {
      path: path.join(outputPath, "server-function.zip"),
    });

    return { handlerFilename, asset };
  }

  private bind(constructs: SSTConstruct[]): void {
    const app = this.node.root as App;
    this.bindingEnvs = {
      SST_APP: app.name,
      SST_STAGE: app.stage,
      SST_REGION: app.region,
      SST_SSM_PREFIX: useProject().config.ssmPrefix,
    };

    // Get referenced secrets
    const referencedSecrets: Secret[] = [];
    constructs.forEach((c) =>
      referencedSecrets.push(...getReferencedSecrets(c))
    );

    [...constructs, ...referencedSecrets].forEach((c) => {
      // Bind environment
      this.bindingEnvs = {
        ...this.bindingEnvs,
        ...bindEnvironment(c),
      };

      // Bind permissions
      if (this.props.permissions !== "*") {
        this.props.permissions.push(
          ...Object.entries(bindPermissions(c)).map(
            ([action, resources]) =>
              new PolicyStatement({
                actions: [action],
                effect: Effect.ALLOW,
                resources,
              })
          )
        );
      }
    });
  }

  private createCodeReplacer(
    assetBucket: string,
    assetKey: string,
    handlerFilename: string
  ) {
    const { environment } = this.props;
    const stack = Stack.of(this) as Stack;

    // Note: Source code for the Lambda functions have "{{ ENV_KEY }}" in them.
    //       They need to be replaced with real values before the Lambda
    //       functions get deployed.
    const replacements: BaseSiteReplaceProps[] = [
      {
        files: handlerFilename,
        search: '"{{ _SST_FUNCTION_ENVIRONMENT_ }}"',
        replace: JSON.stringify({
          ...environment,
          ...this.bindingEnvs,
        }),
      },
      ...Object.entries(environment).map(([key, value]) => ({
        files: "**/*.@(*js|json|html)",
        search: `{{ ${key} }}`,
        replace: value,
      })),
    ];

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

    const resource = new CustomResource(this.scope, "AssetReplacer", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AssetReplacer",
      properties: {
        bucket: assetBucket,
        key: assetKey,
        replacements,
      },
    });
    resource.node.addDependency(policy);

    return { assetReplacer: resource, assetReplacerPolicy: policy };
  }

  private updateCodeReplacer(
    assetBucket: string,
    assetKey: string,
    handlerFilename: string
  ) {
    const stack = Stack.of(this) as Stack;

    const cfnReplacer = this.assetReplacer.node
      .defaultChild as CfnCustomResource;
    cfnReplacer.addPropertyOverride("bucket", assetBucket);
    cfnReplacer.addPropertyOverride("key", assetKey);
    cfnReplacer.addPropertyOverride("replacements.0.files", handlerFilename);

    const cfnPolicy = this.assetReplacerPolicy.node.defaultChild as CfnPolicy;
    cfnPolicy.addPropertyOverride(
      "PolicyDocument.Statement.0.Resource",
      `arn:${stack.partition}:s3:::${assetBucket}/*`
    );
  }

  private createRole() {
    const { permissions } = this.props;

    // Create function role
    const role = new Role(this.scope, `ServerLambdaRole`, {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal("lambda.amazonaws.com"),
        new ServicePrincipal("edgelambda.amazonaws.com")
      ),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "EdgeLambdaPolicy",
          `arn:${
            Stack.of(this).partition
          }:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
        ),
      ],
    });

    // Attach permission
    if (permissions) {
      attachPermissionsToRole(role, permissions);
    }

    return role;
  }

  private createSingletonBucketInUsEast1() {
    // Create a S3 bucket in us-east-1 to store Lambda code. Create
    // 1 bucket for all Edge functions.

    // Do not recreate if exist
    const providerId = "EdgeLambdaBucketProvider";
    const resId = "EdgeLambdaBucket";
    const stack = Stack.of(this);
    const existingResource = stack.node.tryFindChild(resId) as CustomResource;
    if (existingResource) {
      return existingResource;
    }

    // Create provider
    const provider = new CdkFunction(stack, providerId, {
      code: Code.fromAsset(path.join(__dirname, "../support/edge-function")),
      handler: "s3-bucket.handler",
      runtime: Runtime.NODEJS_16_X,
      timeout: CdkDuration.minutes(15),
      memorySize: 1024,
      initialPolicy: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:*"],
          resources: ["*"],
        }),
      ],
    });

    // Create custom resource
    const resource = new CustomResource(stack, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTEdgeLambdaBucket",
      properties: {
        BucketNamePrefix: `${stack.stackName}-${resId}`,
      },
    });

    return resource;
  }

  private createFunctionInUsEast1(
    assetBucket: string,
    assetKey: string,
    lambdaBucket: CustomResource
  ) {
    const { handler, runtime, timeout, memorySize } = this.props;

    // Do not recreate if exist
    const providerId = "EdgeLambdaProvider";
    const resId = `${this.node.id}EdgeLambda`;
    const stack = Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as CdkFunction;

    // Create provider if not already created
    if (!provider) {
      provider = new CdkFunction(stack, providerId, {
        code: Code.fromAsset(path.join(__dirname, "../support/edge-function")),
        handler: "edge-lambda.handler",
        runtime: Runtime.NODEJS_16_X,
        timeout: CdkDuration.minutes(15),
        memorySize: 1024,
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["lambda:*", "s3:*"],
            resources: ["*"],
          }),
        ],
      });
      if (provider.role) {
        this.role.grantPassRole(provider.role);
      }
    }

    // Create custom resource
    const fn = new CustomResource(this.scope, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTEdgeLambda",
      properties: {
        FunctionNamePrefix: `${Stack.of(this).stackName}-${resId}`,
        FunctionBucket: lambdaBucket.getAttString("BucketName"),
        FunctionParams: {
          Description: `${this.node.id} handler`,
          Handler: path.posix.join(...handler.split(path.sep)),
          Code: {
            S3Bucket: assetBucket,
            S3Key: assetKey,
          },
          Runtime:
            runtime === "nodejs14.x"
              ? Runtime.NODEJS_14_X.name
              : runtime === "nodejs16.x"
              ? Runtime.NODEJS_16_X.name
              : Runtime.NODEJS_18_X.name,
          MemorySize:
            typeof memorySize === "string"
              ? toCdkSize(memorySize).toMebibytes()
              : memorySize,
          Timeout:
            typeof timeout === "string"
              ? toCdkDuration(timeout).toSeconds()
              : timeout,
          Role: this.role.roleArn,
        },
      },
    });
    return { fn, fnArn: fn.getAttString("FunctionArn") };
  }

  private updateFunctionInUsEast1(assetBucket: string, assetKey: string) {
    const cfnLambda = this.functionCR.node.defaultChild as CfnCustomResource;
    cfnLambda.addPropertyOverride("FunctionParams.Code", {
      S3Bucket: assetBucket,
      S3Key: assetKey,
    });
  }

  private createVersionInUsEast1(fn: CustomResource, fnArn: string) {
    // Do not recreate if exist
    const providerId = "EdgeLambdaVersionProvider";
    const resId = `${this.node.id}EdgeLambdaVersion`;
    const stack = Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as CdkFunction;

    // Create provider if not already created
    if (!provider) {
      provider = new CdkFunction(stack, providerId, {
        code: Code.fromAsset(path.join(__dirname, "../support/edge-function")),
        handler: "edge-lambda-version.handler",
        runtime: Runtime.NODEJS_16_X,
        timeout: CdkDuration.minutes(15),
        memorySize: 1024,
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["lambda:*"],
            resources: ["*"],
          }),
        ],
      });
    }

    // Create custom resource
    const version = new CustomResource(this.scope, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTEdgeLambdaVersion",
      properties: {
        FunctionArn: fnArn,
      },
    });

    // Override the version's logical ID with a lazy string which includes the
    // hash of the function itself, so a new version resource is created when
    // the function configuration changes.
    const cfn = version.node.defaultChild as CfnResource;
    const originalLogicalId = Stack.of(version).resolve(
      cfn.logicalId
    ) as string;
    cfn.overrideLogicalId(
      Lazy.uncachedString({
        produce: () => {
          const hash = this.calculateHash(fn);
          const logicalId = this.trimFromStart(originalLogicalId, 255 - 32);
          return `${logicalId}${hash}`;
        },
      })
    );

    return { version, versionId: version.getAttString("Version") };
  }

  private getHandlerExtension(pathWithoutExtension: string) {
    const ext = [
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
    ].find((ext) => fs.existsSync(pathWithoutExtension + ext));

    if (!ext) {
      throw new Error(
        `Cannot find the SSR function handler file for the "${this.scope.node.id}" Site.`
      );
    }
    return ext;
  }

  private trimFromStart(s: string, maxLength: number) {
    const desiredLength = Math.min(maxLength, s.length);
    const newStart = s.length - desiredLength;
    return s.substring(newStart);
  }

  private calculateHash(resource: CustomResource): string {
    // render the cloudformation resource from this function
    // config is of the shape:
    // {
    //  Resources: {
    //    LogicalId: {
    //      Type: 'Function',
    //      Properties: { ... }
    // }}}
    const cfnResource = resource.node.defaultChild as CfnResource;
    const config = Stack.of(resource).resolve(
      (cfnResource as any)._toCloudFormation()
    );
    const resources = config.Resources;
    const resourceKeys = Object.keys(resources);
    if (resourceKeys.length !== 1) {
      throw new Error(
        `Expected one rendered CloudFormation resource but found ${resourceKeys.length}`
      );
    }
    const logicalId = resourceKeys[0];
    const properties = resources[logicalId].Properties.FunctionParams;

    const hash = crypto.createHash("md5");
    hash.update(JSON.stringify(properties));
    return hash.digest("hex");
  }
}
