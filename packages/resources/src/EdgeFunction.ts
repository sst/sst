import url from "url";
import path from "path";
import fs from "fs-extra";
import crypto from "crypto";
import { Construct, IConstruct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3Assets from "aws-cdk-lib/aws-s3-assets";
import { AwsCliLayer } from "aws-cdk-lib/lambda-layer-awscli";
import {
  Lazy,
  Duration,
  CfnResource,
  CustomResource,
} from "aws-cdk-lib";

import { Stack } from "./Stack.js";
import { Permissions, attachPermissionsToRole } from "./util/permission.js";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface EdgeFunctionProps {
  bundlePath: string;
  handler: string;
  timeout?: number;
  memory?: number;
  permissions?: Permissions;
  environment?: Record<string, string>;
  /**
   * This is intended to be used internally by SST to make constructs
   * backwards compatible when the hirechical structure of the constructs
   * changes. When the hirerchical structure changes, the child AWS
   * resources' logical ID will change. And CloudFormation will recreate
   * them.
   */
  scopeOverride?: IConstruct;
}

/////////////////////
// Construct
/////////////////////

export class EdgeFunction extends Construct {
  public role: iam.Role;
  public functionArn: string;
  private scope: IConstruct;
  private versionId: string;
  private props: EdgeFunctionProps;

  constructor(scope: Construct, id: string, props: EdgeFunctionProps) {
    super(scope, id);

    this.props = props;
    const { handler } = props;

    // Correct scope
    this.scope = this.props.scopeOverride || this;

    // Wrap function code
    this.wrapFunctionCode();

    // Create function asset
    const asset = this.createAsset();

    // Create function role
    this.role = this.createRole();

    // Create function
    const { functionArn, versionId } = this.createFunction(asset);
    this.functionArn = functionArn;
    this.versionId = versionId;
  }

  public get currentVersion(): lambda.IVersion {
    return lambda.Version.fromVersionArn(
      this,
      `${this.node.id}FunctionVersion`,
      `${this.functionArn}:${this.versionId}`
    );
  }

  public attachPermissions(permissions: Permissions) {
    attachPermissionsToRole(this.role, permissions);
  }

  private wrapFunctionCode() {
    // Parse handler
    const parts = this.props.handler.split(".");
    const handlerImportPath = parts.slice(0, -1).join(".");
    const handlerMethod = parts.slice(-1)[0];

    const content = `
"use strict";

const index = require("./${handlerImportPath}");

const handler = async (event) => {
  try {
    // We expose an environment variable token which is used by the code
    // replacer to inject the environment variables assigned to the
    // EdgeFunction construct.
    //
    // "{{ _SST_EDGE_FUNCTION_ENVIRONMENT_ }}" will get replaced during
    // deployment with an object of environment key-value pairs, ie.
    // const environment = {"API_URL": "https://api.example.com"};
    //
    // This inlining strategy is required as Lambda@Edge doesn't natively
    // support runtime environment variables. A downside of this approach
    // is that environment variables cannot be toggled after deployment,
    // each change to one requires a redeployment.
    const environment = "{{ _SST_EDGE_FUNCTION_ENVIRONMENT_ }}";
    process.env = { ...process.env, ...environment };
  } catch (e) {
    console.log("Failed to set SST Lambda@Edge environment.");
    console.log(e);
  }

  return await index.${handlerMethod}(event);
};

exports.handler = handler;
  `;

    const { bundlePath } = this.props;

    fs.writeFileSync(
      path.join(bundlePath, "index-wrapper.js"),
      content
    );
  }

  private createAsset() {
    const { bundlePath } = this.props;

    return new s3Assets.Asset(this.scope, `FunctionAsset`, {
      path: bundlePath,
    });
  }

  private createRole() {
    const { permissions } = this.props;

    // Create function role
    const role = new iam.Role(this.scope, `ServerLambdaRole`, {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("lambda.amazonaws.com"),
        new iam.ServicePrincipal("edgelambda.amazonaws.com"),
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this,
          "EdgeLambdaPolicy",
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Attach permission
    if (permissions) {
      attachPermissionsToRole(role, permissions);
    }

    return role;
  }

  private createFunction(asset: s3Assets.Asset) {
    const { timeout, memory, bundlePath } = this.props;
    const name = this.node.id;

    // Create a S3 bucket in us-east-1 to store Lambda code. Create
    // 1 bucket for all Edge functions.
    const bucketCR = this.createSingletonBucketCR();
    const bucketName = bucketCR.getAttString("BucketName");

    // Create a Lambda function in us-east-1
    const functionCR = this.createFunctionCR(
      name,
      this.role,
      bucketName,
      {
        Description: `${name} handler`,
        Handler: "index-wrapper.handler",
        Code: {
          S3Bucket: asset.s3BucketName,
          S3Key: asset.s3ObjectKey,
        },
        Runtime: lambda.Runtime.NODEJS_16_X.name,
        MemorySize: memory || 512,
        Timeout: Duration.seconds(timeout || 10).toSeconds(),
        Role: this.role.roleArn,
      }
    );
    const functionArn = functionCR.getAttString("FunctionArn");

    // Create a Lambda function version in us-east-1
    const versionCR = this.createVersionCR(name, functionArn);
    const versionId = versionCR.getAttString("Version");
    this.updateVersionLogicalId(functionCR, versionCR);

    // Deploy after the code is updated
    const updaterCR = this.createLambdaCodeReplacer(name, asset);
    functionCR.node.addDependency(updaterCR);

    return { functionArn, versionId };
  }

  private createSingletonAwsCliLayer(): AwsCliLayer {
    // Do not recreate if exist
    const resId = "AwsCliLayer";
    const stack = Stack.of(this);
    const existingResource = stack.node.tryFindChild(resId);
    if (existingResource) {
      return existingResource as AwsCliLayer;
    }

    // Create custom resource
    return new AwsCliLayer(stack, resId);
  }

  private createLambdaCodeReplacer(
    name: string,
    asset: s3Assets.Asset
  ): CustomResource {
    // Note: Source code for the Lambda functions have "{{ ENV_KEY }}" in them.
    //       They need to be replaced with real values before the Lambda
    //       functions get deployed.

    const providerId = "LambdaCodeReplacerProvider";
    const resId = `${name}LambdaCodeReplacer`;
    const stack = Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as lambda.Function;

    // Create provider if not already created
    if (!provider) {
      provider = new lambda.Function(stack, providerId, {
        code: lambda.Code.fromAsset(
          // TODO: Move this file into a shared folder
          // This references a Nextjs directory, but the underlying
          // code appears to be generic enough to utilise in this case.
          path.join(__dirname, "../assets/NextjsSite/custom-resource")
        ),
        layers: [this.createSingletonAwsCliLayer()],
        runtime: lambda.Runtime.PYTHON_3_7,
        handler: "lambda-code-updater.handler",
        timeout: Duration.minutes(15),
        memorySize: 1024,
      });
    }

    // Allow provider to perform search/replace on the asset
    provider.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [`arn:aws:s3:::${asset.s3BucketName}/${asset.s3ObjectKey}`],
      })
    );

    // Create custom resource to replace the code
    const resource = new CustomResource(this.scope, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTLambdaCodeUpdater",
      properties: {
        Source: {
          BucketName: asset.s3BucketName,
          ObjectKey: asset.s3ObjectKey,
        },
        ReplaceValues: [{
          files: "index-wrapper.js",
          search: '"{{ _SST_EDGE_FUNCTION_ENVIRONMENT_ }}"',
          replace: JSON.stringify(this.props.environment || {}),
        }],
      },
    });

    return resource;
  }

  private createSingletonBucketCR(): CustomResource {
    // Do not recreate if exist
    const providerId = "EdgeLambdaBucketProvider";
    const resId = "EdgeLambdaBucket";
    const stack = Stack.of(this);
    const existingResource = stack.node.tryFindChild(resId) as CustomResource;
    if (existingResource) {
      return existingResource;
    }

    // Create provider
    const provider = new lambda.Function(stack, providerId, {
      code: lambda.Code.fromAsset(path.join(__dirname, "nextjs-site", "custom-resource")),
      handler: "s3-bucket.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: Duration.minutes(15),
      memorySize: 1024,
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
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

  private createFunctionCR(
    name: string,
    role: iam.Role,
    bucketName: string,
    functionParams: any
  ): CustomResource {
    // Do not recreate if exist
    const providerId = "EdgeLambdaProvider";
    const resId = `${name}EdgeLambda`;
    const stack = Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as lambda.Function;

    // Create provider if not already created
    if (!provider) {
      provider = new lambda.Function(stack, providerId, {
        code: lambda.Code.fromAsset(path.join(__dirname, "nextjs-site", "custom-resource")),
        handler: "edge-lambda.handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        timeout: Duration.minutes(15),
        memorySize: 1024,
        initialPolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:*", "s3:*"],
            resources: ["*"],
          }),
        ],
      });
      if (provider.role) {
        role.grantPassRole(provider.role);
      }
    }

    // Create custom resource
    const resource = new CustomResource(this.scope, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTEdgeLambda",
      properties: {
        FunctionNamePrefix: `${Stack.of(this).stackName}-${resId}`,
        FunctionBucket: bucketName,
        FunctionParams: functionParams,
      },
    });

    return resource;
  }

  private createVersionCR(
    name: string,
    functionArn: string
  ): CustomResource {
    // Do not recreate if exist
    const providerId = "EdgeLambdaVersionProvider";
    const resId = `${name}EdgeLambdaVersion`;
    const stack = Stack.of(this);
    let provider = stack.node.tryFindChild(providerId) as lambda.Function;

    // Create provider if not already created
    if (!provider) {
      provider = new lambda.Function(stack, providerId, {
        code: lambda.Code.fromAsset(path.join(__dirname, "nextjs-site", "custom-resource")),
        handler: "edge-lambda-version.handler",
        runtime: lambda.Runtime.NODEJS_16_X,
        timeout: Duration.minutes(15),
        memorySize: 1024,
        initialPolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["lambda:*"],
            resources: ["*"],
          }),
        ],
      });
    }

    // Create custom resource
    return new CustomResource(this.scope, resId, {
      serviceToken: provider.functionArn,
      resourceType: "Custom::SSTEdgeLambdaVersion",
      properties: {
        FunctionArn: functionArn,
      },
    });
  }

  /////////////////////
  // Internal Functions
  /////////////////////

  private updateVersionLogicalId(
    functionCR: CustomResource,
    versionCR: CustomResource
  ) {
    // Override the version's logical ID with a lazy string which includes the
    // hash of the function itself, so a new version resource is created when
    // the function configuration changes.
    const cfn = versionCR.node.defaultChild as CfnResource;
    const originalLogicalId = Stack.of(versionCR).resolve(
      cfn.logicalId
    ) as string;
    cfn.overrideLogicalId(
      Lazy.uncachedString({
        produce: () => {
          const hash = this.calculateHash(functionCR);
          const logicalId = this.trimFromStart(originalLogicalId, 255 - 32);
          return `${logicalId}${hash}`;
        },
      })
    );
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