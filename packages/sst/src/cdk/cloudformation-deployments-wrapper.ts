import { ToolkitInfo } from "aws-cdk/lib/api/toolkit-info.js";
import { Context } from "../context/context.js";
import { CloudFormationDeployments, DeployStackOptions, prepareSdkWithLookupRoleFor } from "./cloudformation-deployments.js";

export async function publishAssets(
  deployment: CloudFormationDeployments,
  options: DeployStackOptions
) {
  const toolkitInfo = await useToolkitInfo().lookup(deployment, options);

  await deployment.publishStackAssets(options.stack, toolkitInfo, {
    buildAssets: options.buildAssets ?? true,
    publishOptions: {
      quiet: options.quiet,
      parallel: options.assetParallelism,
    },
  });
}

const useToolkitInfo = Context.memo(() => {
  const state = new Map<CloudFormationDeployments, ToolkitInfo>();
  return {
    async lookup(
      deployment: CloudFormationDeployments,
      options: DeployStackOptions
    ) {
      if (state.has(deployment))
        return state.get(deployment)!;

      const { stackSdk, resolvedEnvironment } =
        await deployment.prepareSdkFor(options.stack, options.roleArn);
      const toolkitInfo = await ToolkitInfo.lookup(
        resolvedEnvironment,
        stackSdk,
        options.toolkitStackName
      );
      state.set(deployment, toolkitInfo);
      return toolkitInfo;
    }
  }
});