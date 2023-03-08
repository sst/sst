import fs from "fs";
import url from "url";
import path from "path";
import crypto from "crypto";
import { BuildOptions, buildSync } from "esbuild";
import { Construct, IConstruct } from "constructs";
import {
  Effect,
  Role,
  Policy,
  PolicyStatement,
  CompositePrincipal,
  ServicePrincipal,
  ManagedPolicy,
} from "aws-cdk-lib/aws-iam";
import {
  Version,
  IVersion,
  Code,
  Runtime,
  Function as CdkFunction,
} from "aws-cdk-lib/aws-lambda";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import {
  Lazy,
  Duration as CdkDuration,
  CfnResource,
  CustomResource,
} from "aws-cdk-lib";

import { useProject } from "../project.js";
import { BaseSiteReplaceProps } from "./BaseSite.js";
import { SSTConstruct } from "./Construct.js";
import { App } from "./App.js";
import { Stack } from "./Stack.js";
import { Secret } from "./Config.js";
import {
  bindEnvironment,
  bindPermissions,
  getReferencedSecrets,
} from "./util/functionBinding.js";
import { Size, toCdkSize } from "./util/size.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface EdgeFunctionProps {
  bundle?: string;
  handler: string;
  runtime: "nodejs14.x" | "nodejs16.x" | "nodejs18.x";
  timeout: number | Duration;
  memorySize: number | Size;
  permissions?: Permissions;
  environment?: Record<string, string>;
  bind?: SSTConstruct[];
  esbuild?: BuildOptions;
  format: "cjs" | "esm";
  scopeOverride?: IConstruct;
}

/////////////////////
// Construct
/////////////////////

export class EdgeFunction extends Construct {
  public role: Role;
  public functionArn: string;
  private scope: IConstruct;
  private versionId: string;
  private bindingEnvs: Record<string, string>;
  private props: EdgeFunctionProps & {
    bundle: Exclude<EdgeFunctionProps["bundle"], undefined>;
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
      bundle: props.bundle || "placeholder",
      environment: props.environment || {},
      permissions: props.permissions || [],
    };

    // Build bundle if not prebuilt
    const { bundle, handler, handlerFilename } = props.bundle
      ? this.updateBundleWithEnvWrapper()
      : this.buildBundle();
    this.props.bundle = bundle;
    this.props.handler = handler;

    // Bind first b/e function's environment variables cannot be added after
    this.bindingEnvs = {};
    this.bind(props.bind || []);

    const asset = this.createCodeAsset();
    const assetReplacer = this.createCodeReplacer(asset, handlerFilename);
    this.role = this.createRole();
    const bucket = this.createSingletonBucketInUsEast1();
    const { fn, fnArn } = this.createFunctionInUsEast1(asset, bucket);
    const { versionId } = this.createVersionInUsEast1(fn, fnArn);

    // Deploy after the code is updated
    fn.node.addDependency(assetReplacer);

    this.functionArn = fnArn;
    this.versionId = versionId;
  }

  public get currentVersion(): IVersion {
    return Version.fromVersionArn(
      this,
      `${this.node.id}FunctionVersion`,
      `${this.functionArn}:${this.versionId}`
    );
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.role, permissions);
  }

  private buildBundle() {
    const { handler, format, esbuild, runtime } = this.props;
    const isESM = format === "esm";
    const {
      dir: inputPath,
      base: inputHandler,
      name: inputFilename,
      ext: inputHandlerFunction,
    } = path.parse(handler);
    const inputFileExt = this.getHandlerExtension(
      path.join(inputPath, inputFilename)
    );

    // Create a directory that we will use to create the bundled version
    // of the "core server build" along with our custom Lamba server handler.
    const outputPath = path.resolve(
      path.join(
        useProject().paths.artifacts,
        `EdgeFunction-${this.node.id}-${this.node.addr}`
      )
    );
    const outputHandler = inputHandler;
    const outputFilename = inputFilename;
    const outputFileExt = isESM ? ".mjs" : ".cjs";

    const { external, ...override } = esbuild || {};
    const result = buildSync({
      entryPoints: [handler.replace(inputHandlerFunction, inputFileExt)],
      platform: "node",
      external: [
        ...(isESM || runtime === "nodejs18.x" ? [] : ["aws-sdk"]),
        ...(external || []),
      ],
      metafile: true,
      bundle: true,
      ...(isESM
        ? {
            format: "esm",
            target: "esnext",
            mainFields: ["module", "main"],
            banner: {
              js: [
                `import { createRequire as topLevelCreateRequire } from 'module';`,
                `const require = topLevelCreateRequire(import.meta.url);`,
                `import { fileURLToPath as topLevelFileUrlToPath } from "url"`,
                `const __dirname = topLevelFileUrlToPath(new URL(".", import.meta.url))`,
                `process.env = { ...process.env, ..."{{ _SST_FUNCTION_ENVIRONMENT_ }}" };`,
              ].join("\n"),
            },
          }
        : {
            format: "cjs",
            target: "node14",
          }),
      outfile: path.join(outputPath, outputFilename + outputFileExt),
      ...override,
    });

    if (result.errors.length > 0) {
      result.errors.forEach((error) => console.error(error));
      throw new Error(
        `There was a problem bundling the SSR function for the "${this.scope.node.id}" Site.`
      );
    }

    return {
      bundle: outputPath,
      handler: outputHandler,
      handlerFilename: outputFilename + outputFileExt,
    };
  }

  private updateBundleWithEnvWrapper() {
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

    const { bundle, handler } = this.props;
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

    return { bundle, handler, handlerFilename };
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

  private createCodeAsset() {
    const { bundle } = this.props;

    return new Asset(this.scope, `FunctionAsset`, {
      path: bundle,
    });
  }

  private createCodeReplacer(asset: Asset, handlerFilename: string) {
    const { environment } = this.props;

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
        files: "**/*.*js",
        search: `{{ ${key} }}`,
        replace: value,
      })),
    ];

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

    const resource = new CustomResource(this.scope, "AssetReplacer", {
      serviceToken: stack.customResourceHandler.functionArn,
      resourceType: "Custom::AssetReplacer",
      properties: {
        bucket: asset.s3BucketName,
        key: asset.s3ObjectKey,
        replacements,
      },
    });
    resource.node.addDependency(policy);

    return resource;
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

  private createFunctionInUsEast1(asset: Asset, bucket: CustomResource) {
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
        FunctionBucket: bucket.getAttString("BucketName"),
        FunctionParams: {
          Description: `${this.node.id} handler`,
          Handler: handler,
          Code: {
            S3Bucket: asset.s3BucketName,
            S3Key: asset.s3ObjectKey,
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
