import path from "path";
import crypto from "crypto";
import url from "url";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function getOrCreateBucket(scope: Construct): cdk.CustomResource {
  // Do not recreate if exist
  const providerId = "EdgeLambdaBucketProvider";
  const resId = "EdgeLambdaBucket";
  const stack = cdk.Stack.of(scope);
  const existingResource = stack.node.tryFindChild(resId) as cdk.CustomResource;
  if (existingResource) {
    return existingResource;
  }

  // Create provider
  const provider = new lambda.Function(stack, providerId, {
    code: lambda.Code.fromAsset(path.join(__dirname, "custom-resource")),
    handler: "s3-bucket.handler",
    runtime: lambda.Runtime.NODEJS_16_X,
    timeout: cdk.Duration.minutes(15),
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
  const resource = new cdk.CustomResource(stack, resId, {
    serviceToken: provider.functionArn,
    resourceType: "Custom::SSTEdgeLambdaBucket",
    properties: {
      BucketNamePrefix: `${stack.stackName}-${resId}`,
    },
  });

  return resource;
}

export function createFunction(
  scope: Construct,
  name: string,
  role: iam.Role,
  bucketName: string,
  functionParams: any
): cdk.CustomResource {
  // Do not recreate if exist
  const providerId = "EdgeLambdaProvider";
  const resId = `${name}EdgeLambda`;
  const stack = cdk.Stack.of(scope);
  let provider = stack.node.tryFindChild(providerId) as lambda.Function;

  // Create provider if not already created
  if (!provider) {
    provider = new lambda.Function(stack, providerId, {
      code: lambda.Code.fromAsset(path.join(__dirname, "custom-resource")),
      handler: "edge-lambda.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(15),
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
  const resource = new cdk.CustomResource(scope, resId, {
    serviceToken: provider.functionArn,
    resourceType: "Custom::SSTEdgeLambda",
    properties: {
      FunctionNamePrefix: `${cdk.Stack.of(scope).stackName}-${resId}`,
      FunctionBucket: bucketName,
      FunctionParams: functionParams,
    },
  });

  return resource;
}

export function createVersion(
  scope: Construct,
  name: string,
  functionArn: string
): cdk.CustomResource {
  // Do not recreate if exist
  const providerId = "EdgeLambdaVersionProvider";
  const resId = `${name}EdgeLambdaVersion`;
  const stack = cdk.Stack.of(scope);
  let provider = stack.node.tryFindChild(providerId) as lambda.Function;

  // Create provider if not already created
  if (!provider) {
    provider = new lambda.Function(stack, providerId, {
      code: lambda.Code.fromAsset(path.join(__dirname, "custom-resource")),
      handler: "edge-lambda-version.handler",
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.minutes(15),
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
  return new cdk.CustomResource(scope, resId, {
    serviceToken: provider.functionArn,
    resourceType: "Custom::SSTEdgeLambdaVersion",
    properties: {
      FunctionArn: functionArn,
    },
  });
}

export function updateVersionLogicalId(
  functionCR: cdk.CustomResource,
  versionCR: cdk.CustomResource
) {
  // Override the version's logical ID with a lazy string which includes the
  // hash of the function itself, so a new version resource is created when
  // the function configuration changes.
  const cfn = versionCR.node.defaultChild as cdk.CfnResource;
  const originalLogicalId = cdk.Stack.of(versionCR).resolve(
    cfn.logicalId
  ) as string;
  cfn.overrideLogicalId(
    cdk.Lazy.uncachedString({
      produce: () => {
        const hash = calculateHash(functionCR);
        const logicalId = trimFromStart(originalLogicalId, 255 - 32);
        return `${logicalId}${hash}`;
      },
    })
  );
}

function trimFromStart(s: string, maxLength: number) {
  const desiredLength = Math.min(maxLength, s.length);
  const newStart = s.length - desiredLength;
  return s.substring(newStart);
}

function calculateHash(resource: cdk.CustomResource): string {
  // render the cloudformation resource from this function
  // config is of the shape:
  // {
  //  Resources: {
  //    LogicalId: {
  //      Type: 'Function',
  //      Properties: { ... }
  // }}}
  const cfnResource = resource.node.defaultChild as cdk.CfnResource;
  const config = cdk.Stack.of(resource).resolve(
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
