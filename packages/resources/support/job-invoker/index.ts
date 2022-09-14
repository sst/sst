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
  console.log(`View log: https://${process.env.AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${process.env.AWS_REGION}#logsV2:log-groups/log-group/$252Faws$252Fcodebuild$252F${projectName}/log-events/${buildId}`);
}