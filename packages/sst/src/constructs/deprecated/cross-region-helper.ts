import path from "path";
import crypto from "crypto";
import url from "url";
import { Construct } from "constructs";
import {
  CfnResource,
  CustomResource,
  Duration,
  Lazy,
  Stack,
} from "aws-cdk-lib/core";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function getOrCreateBucket(scope: Construct): CustomResource {
  // Do not recreate if exist
  const providerId = "EdgeLambdaBucketProvider";
  const resId = "EdgeLambdaBucket";
  const stack = Stack.of(scope);
  const existingResource = stack.node.tryFindChild(resId) as CustomResource;
  if (existingResource) {
    return existingResource;
  }

  // Create provider
  const provider = new lambda.Function(stack, providerId, {
    code: lambda.Code.fromAsset(
      path.join(__dirname, "../../support/edge-function")
    ),
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

export function createFunction(
  scope: Construct,
  name: string,
  role: iam.Role,
  bucketName: string,
  functionParams: any
): CustomResource {
  // Do not recreate if exist
  const providerId = "EdgeLambdaProvider";
  const resId = `${name}EdgeLambda`;
  const stack = Stack.of(scope);
  let provider = stack.node.tryFindChild(providerId) as lambda.Function;

  // Create provider if not already created
  if (!provider) {
    provider = new lambda.Function(stack, providerId, {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../support/edge-function")
      ),
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
  const resource = new CustomResource(scope, resId, {
    serviceToken: provider.functionArn,
    resourceType: "Custom::SSTEdgeLambda",
    properties: {
      FunctionNamePrefix: `${Stack.of(scope).stackName}-${resId}`,
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
): CustomResource {
  // Do not recreate if exist
  const providerId = "EdgeLambdaVersionProvider";
  const resId = `${name}EdgeLambdaVersion`;
  const stack = Stack.of(scope);
  let provider = stack.node.tryFindChild(providerId) as lambda.Function;

  // Create provider if not already created
  if (!provider) {
    provider = new lambda.Function(stack, providerId, {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../support/edge-function")
      ),
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
  return new CustomResource(scope, resId, {
    serviceToken: provider.functionArn,
    resourceType: "Custom::SSTEdgeLambdaVersion",
    properties: {
      FunctionArn: functionArn,
    },
  });
}

export function updateVersionLogicalId(
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

function calculateHash(resource: CustomResource): string {
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
