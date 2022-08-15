import path from "path";
import fs from "fs/promises";
import { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { Config } from "../config/index.js";
import S3 from "aws-sdk/clients/s3.js";
import { Bootstrap } from "../bootstrap/index.js";

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
  const s3 = new S3({ region: config.region });
  const list = await s3
    .listObjectsV2({
      Bucket: Bootstrap.assets.bucketName!,
      Prefix: `stackMetadata/app.${config.name}/stage.${config.stage!}/`
    })
    .promise();
  const result = await Promise.all(
    (list.Contents || []).map(async c => {
      // Download the file
      const ret = await s3
        .getObject({
          Bucket: Bootstrap.assets.bucketName!,
          Key: c.Key!
        })
        .promise();
      // Parse the file
      const json = JSON.parse(ret.Body!.toString());
      return json;
    })
  );
  return result.flat();
}
