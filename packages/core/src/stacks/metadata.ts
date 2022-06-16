import path from "path";
import fs from "fs/promises";
import { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import Cloudformation from "aws-sdk/clients/cloudformation.js";
import { Config } from "../config/index.js";

interface Manifest {
  version: string;
  artifacts: Record<string, Artifact>;
}

type Artifact = StackArtifact;

interface StackArtifact {
  type: "aws:cloudformation:stack";
  properties: CloudFormationStackArtifact;
  displayName: string;
}

export async function manifest(root: string) {
  const manifestPath = path.join(root, ".build", "cdk.out", "manifest.json");
  const data = await fs.readFile(manifestPath);
  return JSON.parse(data.toString()) as Manifest;
}

export async function metadata(root: string, config: Config) {
  const cfn = new Cloudformation({ region: config.region });
  const man = await manifest(root);
  const stacks = Object.values(man.artifacts).filter(
    a => a.type === "aws:cloudformation:stack"
  );
  const constructs = await Promise.all(
    stacks.map(async stack => {
      const resource = await cfn
        .describeStackResource({
          StackName: stack.properties.stackName || stack.displayName,
          LogicalResourceId: "SSTMetadata"
        })
        .promise();
      const parsed = JSON.parse(resource.StackResourceDetail!.Metadata!);
      const constructs = parsed["sst:constructs"];
      return constructs;
    })
  );
  return constructs.flat();
}
