import { useBootstrap } from "../bootstrap.js";
import {
  useAWSCredentials,
} from "../credentials.js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { json } from "stream/consumers";
import { Context } from "../context/context.js";
import { Logger } from "../logger.js";
import { useProject } from "../project.js";

interface Metadata {
  mode: "deploy" | "dev";
}

async function metadata() {
  Logger.debug("Fetching app metadata");
  const [project, credentials, bootstrap] = await Promise.all([
    useProject(),
    useAWSCredentials(),
    useBootstrap(),
  ]);
  const s3 = new S3Client({
    region: project.config.region,
    credentials,
  });

  try {
    const result = await s3
      .send(
        new GetObjectCommand({
          Key: useS3Key(),
          Bucket: bootstrap.bucket,
        })
      )
      .then((result) => json(result.Body as any));
    return result as Metadata;
  } catch (ex) {
    Logger.debug("Fetching app metadata: not found");
  }
}

export async function saveAppMetadata(data: Metadata) {
  Logger.debug("Saving app metadata");
  const [project, credentials, bootstrap] = await Promise.all([
    useProject(),
    useAWSCredentials(),
    useBootstrap(),
  ]);
  const s3 = new S3Client({
    region: project.config.region,
    credentials,
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Key: useS3Key(),
        Bucket: bootstrap.bucket,
        Body: JSON.stringify(data),
      })
    );
  } catch (ex) {
    Logger.debug("Saving app metadata: not found");
  }
}

export async function clearAppMetadata() {
  Logger.debug("Clearing app metadata");
  const [project, credentials, bootstrap] = await Promise.all([
    useProject(),
    useAWSCredentials(),
    useBootstrap(),
  ]);
  const s3 = new S3Client({
    region: project.config.region,
    credentials,
  });

  await s3.send(
    new DeleteObjectCommand({
      Key: useS3Key(),
      Bucket: bootstrap.bucket,
    })
  );
}

function useS3Key() {
  const project = useProject();
  return `appMetadata/app.${project.config.name}/stage.${project.config.stage}.json`;
}

const MetadataContext = Context.create(async () => {
  const data = await metadata();
  return data;
});

export const useAppMetadata = MetadataContext.use;
