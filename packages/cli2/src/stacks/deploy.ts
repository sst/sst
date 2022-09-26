import fs from "fs/promises";
import path from "path";
import {
  CloudFormationClient,
  UpdateStackCommand,
} from "@aws-sdk/client-cloudformation";
import {
  AssetManifestArtifact,
  CloudFormationStackArtifact,
} from "aws-cdk-lib/cx-api";
import { AssetManifest } from "cdk-assets";
import { useAWSClient, useAWSProvider } from "../credentials/index.js";
import { Logger } from "../logger/index.js";

import { publishAssets } from "aws-cdk/lib/util/asset-publishing.js";

export async function deploy(stack: CloudFormationStackArtifact) {
  Logger.debug("Deploying stack", stack.id);
  const assets = stack.dependencies.filter(
    AssetManifestArtifact.isAssetManifestArtifact
  ) as unknown as AssetManifestArtifact[];
  const provider = await useAWSProvider();
  const stackEnv = await provider.resolveEnvironment(stack.environment);
  await Promise.all(
    assets.map(async (asset) => {
      const manifest = AssetManifest.fromFile(asset.file);
      await publishAssets(manifest, provider, stackEnv, {
        quiet: true,
      });
      Logger.debug("Published", manifest.list().length, "assets");
    })
  );
  const cfn = await useAWSClient(CloudFormationClient);
  await cfn.send(
    new UpdateStackCommand({
      StackName: stack.stackName,
      TemplateBody: await fs
        .readFile(path.join(stack.assembly.directory, stack.templateFile))
        .then((x) => x.toString()),
      Capabilities: ["CAPABILITY_IAM"],
    })
  );
}
