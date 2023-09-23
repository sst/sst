import * as cxapi from "@aws-cdk/cx-api";
import { Environment } from "@aws-cdk/cx-api";
import { AssetManifest } from "cdk-assets";
import { debug } from "sst-aws-cdk/lib/logging.js";
import {
  CloudFormationStack,
  TemplateParameters,
  waitForStackDelete,
} from "sst-aws-cdk/lib/api/util/cloudformation.js";
import { Mode } from "sst-aws-cdk/lib/api/aws-auth/credentials.js";
import { ISDK } from "sst-aws-cdk/lib/api/aws-auth/sdk.js";
import { ToolkitInfo } from "sst-aws-cdk/lib/api/toolkit-info.js";
import { addMetadataAssetsToManifest } from "sst-aws-cdk/lib/assets.js";
import { publishAssets } from "sst-aws-cdk/lib/util/asset-publishing.js";
import { SdkProvider } from "sst-aws-cdk/lib/api/aws-auth/sdk-provider.js";
import { AssetManifestBuilder } from "sst-aws-cdk/lib/util/asset-manifest-builder.js";
import {
  Deployments,
  DeployStackOptions as PublishStackAssetsOptions,
} from "./deployments.js";
import { makeBodyParameter, DeployStackOptions } from "./deploy-stack.js";
import { Context } from "../context/context.js";
import { lazy } from "../util/lazy.js";

export async function publishDeployAssets(
  sdkProvider: SdkProvider,
  options: PublishStackAssetsOptions
) {
  const {
    deployment,
    toolkitInfo,
    stackSdk,
    resolvedEnvironment,
    cloudFormationRoleArn,
  } = await useDeployment().get(sdkProvider, options);

  // TODO
  // old
  //await deployment.publishStackAssets(options.stack, toolkitInfo, {
  //  buildAssets: options.buildAssets ?? true,
  //  publishOptions: {
  //    quiet: options.quiet,
  //    parallel: options.assetParallelism,
  //  },
  //});

  // new
  const assetArtifacts = options.stack.dependencies.filter(
    cxapi.AssetManifestArtifact.isAssetManifestArtifact
  );
  for (const asset of assetArtifacts) {
    const manifest = AssetManifest.fromFile(asset.file);
    //await buildAssets(manifest, sdkProvider, resolvedEnvironment, {
    //});
    await publishAssets(manifest, sdkProvider, resolvedEnvironment, {
      buildAssets: true,
      quiet: options.quiet,
      parallel: options.assetParallelism,
    });
  }

  return deployStack({
    stack: options.stack,
    noMonitor: true,
    resolvedEnvironment,
    deployName: options.deployName,
    notificationArns: options.notificationArns,
    quiet: options.quiet,
    sdk: stackSdk,
    sdkProvider,
    roleArn: cloudFormationRoleArn,
    reuseAssets: options.reuseAssets,
    toolkitInfo,
    tags: options.tags,
    deploymentMethod: options.deploymentMethod,
    force: options.force,
    parameters: options.parameters,
    usePreviousParameters: options.usePreviousParameters,
    progress: options.progress,
    ci: options.ci,
    rollback: options.rollback,
    hotswap: options.hotswap,
    extraUserAgent: options.extraUserAgent,
    resourcesToImport: options.resourcesToImport,
    overrideTemplate: options.overrideTemplate,
    assetParallelism: options.assetParallelism,
  });
}

const useDeployment = lazy(() => {
  const state = new Map<
    string,
    {
      deployment: Deployments;
      toolkitInfo: ToolkitInfo;
      stackSdk: ISDK;
      resolvedEnvironment: Environment;
      cloudFormationRoleArn?: string;
    }
  >();
  return {
    async get(sdkProvider: SdkProvider, options: PublishStackAssetsOptions) {
      const region = options.stack.environment.region;
      if (!state.has(region)) {
        const deployment = new Deployments({ sdkProvider });
        const { stackSdk, resolvedEnvironment, cloudFormationRoleArn } =
          await deployment.prepareSdkFor(
            options.stack,
            options.roleArn,
            Mode.ForWriting
          );
        const toolkitInfo = await ToolkitInfo.lookup(
          resolvedEnvironment,
          stackSdk,
          options.toolkitStackName
        );

        // Do a verification of the bootstrap stack version
        await deployment.validateBootstrapStackVersion(
          options.stack.stackName,
          options.stack.requiresBootstrapStackVersion,
          options.stack.bootstrapStackVersionSsmParameter,
          toolkitInfo
        );

        state.set(region, {
          deployment,
          toolkitInfo,
          stackSdk,
          resolvedEnvironment,
          cloudFormationRoleArn,
        });
      }
      return state.get(region)!;
    },
  };
});

async function deployStack(options: DeployStackOptions): Promise<any> {
  const stackArtifact = options.stack;

  const stackEnv = options.resolvedEnvironment;

  options.sdk.appendCustomUserAgent(options.extraUserAgent);
  const cfn = options.sdk.cloudFormation();
  const deployName = options.deployName || stackArtifact.stackName;

  let cloudFormationStack = await CloudFormationStack.lookup(cfn, deployName);

  if (cloudFormationStack.stackStatus.isCreationFailure) {
    debug(
      `Found existing stack ${deployName} that had previously failed creation. Deleting it before attempting to re-create it.`
    );
    await cfn.deleteStack({ StackName: deployName }).promise();
    const deletedStack = await waitForStackDelete(cfn, deployName);
    if (deletedStack && deletedStack.stackStatus.name !== "DELETE_COMPLETE") {
      throw new Error(
        `Failed deleting stack ${deployName} that had previously failed creation (current state: ${deletedStack.stackStatus})`
      );
    }
    // Update variable to mark that the stack does not exist anymore, but avoid
    // doing an actual lookup in CloudFormation (which would be silly to do if
    // we just deleted it).
    cloudFormationStack = CloudFormationStack.doesNotExist(cfn, deployName);
  }

  // Detect "legacy" assets (which remain in the metadata) and publish them via
  // an ad-hoc asset manifest, while passing their locations via template
  // parameters.
  const legacyAssets = new AssetManifestBuilder();
  const assetParams = await addMetadataAssetsToManifest(
    stackArtifact,
    legacyAssets,
    options.toolkitInfo,
    options.reuseAssets
  );

  const finalParameterValues = { ...options.parameters, ...assetParams };

  const templateParams = TemplateParameters.fromTemplate(
    stackArtifact.template
  );
  const stackParams = options.usePreviousParameters
    ? templateParams.updateExisting(
        finalParameterValues,
        cloudFormationStack.parameters
      )
    : templateParams.supplyAll(finalParameterValues);

  const bodyParameter = await makeBodyParameter(
    stackArtifact,
    options.resolvedEnvironment,
    legacyAssets,
    options.toolkitInfo,
    options.sdk,
    options.overrideTemplate
  );
  await publishAssets(
    legacyAssets.toManifest(stackArtifact.assembly.directory),
    options.sdkProvider,
    stackEnv,
    {
      parallel: options.assetParallelism,
    }
  );

  return {
    isUpdate:
      cloudFormationStack.exists &&
      cloudFormationStack.stackStatus.name !== "REVIEW_IN_PROGRESS",
    params: {
      StackName: deployName,
      TemplateBody: bodyParameter.TemplateBody,
      TemplateURL: bodyParameter.TemplateURL,
      Parameters: stackParams.apiParameters,
      Capabilities: [
        "CAPABILITY_IAM",
        "CAPABILITY_NAMED_IAM",
        "CAPABILITY_AUTO_EXPAND",
      ],
      Tags: options.tags,
    },
  };
}
