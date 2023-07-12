import type { Context } from "aws-lambda";
import {
  CodeBuildClient,
  StartBuildCommand,
  StopBuildCommand,
} from "@aws-sdk/client-codebuild";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const codebuild = new CodeBuildClient({});
const lambda = new LambdaClient({});

export async function handler(event: any, context: Context) {
  if (event.action === "run") {
    return run(event, context);
  } else if (event.action === "cancel") {
    return cancel(event);
  }
}

async function run(event: any, context: Context) {
  const { jobId, logUrl } =
    process.env.SST_JOB_PROVIDER === "codebuild"
      ? await runCodeBuild(event)
      : await runLambda(event, context);
  console.log("Job started", {
    jobId,
    logUrl,
  });
  return { jobId };
}

async function runCodeBuild(event: any) {
  const projectName = process.env.SST_JOB_RUNNER;
  const resp = await codebuild.send(
    new StartBuildCommand({
      projectName,
      environmentVariablesOverride: [
        {
          name: "SST_PAYLOAD",
          value: JSON.stringify(event.payload || {}),
        },
      ],
    })
  );

  const buildId = resp.build?.id;
  return {
    jobId: buildId,
    logUrl: `https://${process.env.AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/projects/${projectName}/build/${buildId}/?region=${process.env.AWS_REGION}`,
  };
}

async function runLambda(event: any, context: Context) {
  const functionName = process.env.SST_JOB_RUNNER;
  await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(event.payload || {})),
    })
  );

  return {
    jobId: context.awsRequestId,
    logUrl: "placeholder",
  };
}

async function cancel(event: any) {
  // Do not need to cancel if the provider is Lambda b/c the job ran
  // locally via Live Lambda.

  if (process.env.SST_JOB_PROVIDER === "codebuild") {
    await codebuild.send(
      new StopBuildCommand({
        id: event.jobId,
      })
    );
  }
}
