import { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { CloudFormationDeployments } from "aws-cdk/lib/api/cloudformation-deployments.js";
import { useAWSProvider } from "../credentials/index.js";
import { Logger } from "../logger/index.js";

export async function deploy(stack: CloudFormationStackArtifact) {
  Logger.debug("Deploying stack", stack.id);
  const provider = await useAWSProvider();
  const deployment = new CloudFormationDeployments({
    sdkProvider: provider
  });
  const result = await deployment.deployStack({
    stack: stack as any,
    quiet: true
  });
}
