import {
  CodeBuildClient,
  StartBuildCommand,
} from "@aws-sdk/client-codebuild";

const codebuild = new CodeBuildClient({});

export async function main(event: any) {
  const resp = await codebuild.send(
    new StartBuildCommand({
      projectName: process.env.PROJECT_NAME,
      environmentVariablesOverride: [
        {
          name: "SST_PAYLOAD",
          value: JSON.stringify(event),
        },
      ]
    })
  );

  const [projectName, buildId] = resp.build?.id?.split(":") || [];
  console.log("Starting job...");
  console.log(`View job: https://${process.env.AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/projects/${projectName}/build/${projectName}%3A${buildId}/?region=${process.env.AWS_REGION}`);
}