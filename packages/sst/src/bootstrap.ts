import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import { Tags, Stack, RemovalPolicy, App } from "aws-cdk-lib";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import { ParameterTier, StringParameter } from "aws-cdk-lib/aws-ssm";
import { useProject } from "./app.js";
import { createSpinner } from "./cli/spinner.js";
import { Context } from "./context/context.js";
import { useAWSClient } from "./credentials.js";
import { VisibleError } from "./error.js";
import { Logger } from "./logger.js";
import { Stacks } from "./stacks/index.js";

const SSM_NAME_VERSION = `/sst/bootstrap/version`;
const SSM_NAME_STACK_NAME = `/sst/bootstrap/stack-name`;
const SSM_NAME_BUCKET_NAME = `/sst/bootstrap/bucket-name`;
export const LATEST_VERSION = "3";

export const useBootstrap = Context.memo(async () => {
  Logger.debug("Initializing bootstrap context");
  const ret = await ssm();
  if (
    !ret.version ||
    !ret.bucket ||
    !ret.stack ||
    ret.version !== LATEST_VERSION
  ) {
    const project = useProject();
    const spinner = createSpinner(
      "Deploying bootstrap stack, this only needs to happen once"
    ).start();

    const app = new App();
    const stack = new Stack(app, "SSTBootstrap", {
      env: {
        region: project.region,
      },
    });

    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(tags)) {
      Tags.of(app).add(key, value);
    }

    const bucket = new Bucket(stack, project.region, {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    new StringParameter(stack, SSM_NAME_VERSION, {
      parameterName: SSM_NAME_VERSION,
      stringValue: LATEST_VERSION,
      tier: ParameterTier.STANDARD,
    });

    new StringParameter(stack, SSM_NAME_STACK_NAME, {
      parameterName: SSM_NAME_STACK_NAME,
      stringValue: stack.stackName,
      tier: ParameterTier.STANDARD,
    });

    new StringParameter(stack, SSM_NAME_BUCKET_NAME, {
      parameterName: SSM_NAME_BUCKET_NAME,
      stringValue: bucket.bucketName,
      tier: ParameterTier.STANDARD,
    });
    const asm = app.synth();
    const result = await Stacks.deploy(asm.stacks[0]);
    if (Object.values(result.errors).length > 0) {
      throw new VisibleError(
        `Failed to deploy bootstrap stack:\n${JSON.stringify(
          result.errors,
          null,
          4
        )}`
      );
    }
    spinner.succeed();
    return ssm();
  }
  Logger.debug("Loaded bootstrap info: ", JSON.stringify(ret));
  return ret;
});

async function ssm() {
  const ssm = useAWSClient(SSMClient);
  const result = await ssm.send(
    new GetParametersCommand({
      Names: [SSM_NAME_VERSION, SSM_NAME_STACK_NAME, SSM_NAME_BUCKET_NAME],
    })
  );

  return {
    version: result.Parameters!.find((p) => p.Name === SSM_NAME_VERSION)?.Value,
    bucket: result.Parameters!.find((p) => p.Name === SSM_NAME_BUCKET_NAME)
      ?.Value,
    stack: result.Parameters!.find((p) => p.Name === SSM_NAME_STACK_NAME)
      ?.Value,
  };
}
