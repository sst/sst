import { Stacks } from "../stacks/index.js";
import { useConfig } from "../config/index.js";
import { Logger } from "../logger/index.js";
import fs from "fs/promises";
import path from "path";
import {
  useAWSClient,
  useAWSCredentials,
  useSTSIdentity,
} from "../credentials/index.js";
import {
  CloudFormationClient,
  UpdateStackCommand,
} from "@aws-sdk/client-cloudformation";
import { CloudFormationDeployments } from "aws-cdk/lib/api/cloudformation-deployments.js";
import { SdkProvider } from "aws-cdk/lib/api/aws-auth/sdk-provider.js";
import { AwsCliCompatible } from "aws-cdk/lib/api/aws-auth/awscli-compatible.js";
import { publishAssets } from "aws-cdk/lib/util/asset-publishing.js";
import { CredentialProviderChain } from "aws-sdk/lib/core";
import { AssetPublishing, AssetManifest } from "cdk-assets";
import { AssetManifestArtifact } from "aws-cdk-lib/cx-api";
import { useBootstrap } from "../bootstrap/index.js";

export async function Build() {
  Logger.debug("Building stacks...");
  const fn = await Stacks.build();
  Logger.debug("Finished building");
  const cfg = await useConfig();
  Logger.debug("Synthesizing stacks...");

  const identity = await useSTSIdentity();
  const { App } = await import("@serverless-stack/resources");
  const bootstrap = await useBootstrap();
  const app = new App(
    {
      account: identity.Account!,
      stage: cfg.stage,
      name: cfg.name,
      region: cfg.region,
      buildDir: ".sst/stacks/",
      skipBuild: true,
      bootstrapAssets: {
        bucketName: bootstrap.bucket,
        version: bootstrap.version,
        stackName: bootstrap.stack,
      },
    },
    {
      outdir: ".sst/out/",
    }
  );

  await fn(app);
  const assembly = app.synth();
  Logger.debug("Finished synthesizing");

  // Deploy
  const config = await useConfig();
  const chain = await AwsCliCompatible.credentialChain({
    profile: config.profile,
  });
  const provider = new SdkProvider(chain, config.region!, {
    region: config.region,
  });
  for (const stack of assembly.stacks) {
    try {
      Logger.debug("Deploying stack", stack.id);
      const assets = stack.dependencies.filter(
        AssetManifestArtifact.isAssetManifestArtifact
      ) as unknown as AssetManifestArtifact[];
      const stackEnv = await provider.resolveEnvironment(stack.environment);

      for (const asset of assets) {
        const manifest = AssetManifest.fromFile(asset.file);
        await publishAssets(manifest, provider, stackEnv, {
          quiet: true,
        });
        Logger.debug("Published", manifest.list().length, "assets");
      }
      const cfn = await useAWSClient(CloudFormationClient);
      const result = await cfn.send(
        new UpdateStackCommand({
          StackName: stack.stackName,
          TemplateBody: await fs
            .readFile(path.join(assembly.directory, stack.templateFile))
            .then((x) => x.toString()),
          Capabilities: ["CAPABILITY_IAM"],
        })
      );
    } catch (err) {}
    Logger.debug("Finished deploying stack", stack.id);
  }
}
