import { useBootstrap } from "../bootstrap.js";
import {
  useAWSCredentials,
  useAWSCredentialsProvider,
} from "../credentials.js";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { json } from "stream/consumers";
import { useCache } from "../cache.js";
import { Context } from "../context/context.js";
import { useBus } from "../bus.js";
import { Stacks } from "./index.js";
import { Logger } from "../logger.js";
import { useProject } from "../project.js";
import type { Metadata } from "../constructs/Metadata.js";

declare module "../bus.js" {
  export interface Events {
    "stacks.metadata": Awaited<ReturnType<typeof metadata>>;
  }
}

export async function metadata() {
  Logger.debug("Fetching all metadata");
  const project = useProject();
  const [credentials, bootstrap] = await Promise.all([
    useAWSCredentials(),
    useBootstrap(),
  ]);
  const s3 = new S3Client({
    region: project.config.region,
    credentials: credentials,
  });

  const key = `stackMetadata/app.${project.config.name}/stage.${project.config.stage}/`;
  const list = await s3.send(
    new ListObjectsV2Command({
      Prefix: key,
      Bucket: bootstrap.bucket,
    })
  );
  const result = Object.fromEntries(
    await Promise.all(
      list.Contents?.map(async (obj) => {
        const stackID = obj.Key?.split("/").pop();
        const result = await s3
          .send(
            new GetObjectCommand({
              Key: obj.Key!,
              Bucket: bootstrap.bucket,
            })
          )
          .then((result) => json(result.Body as any));
        return [stackID, result];
      }) || []
    )
  );
  Logger.debug("Fetched metadata from", list.KeyCount, "stacks");
  return result as Record<string, Metadata[]>;
}

export async function metadataForStack(stackID: string) {
  const [project, credentials, bootstrap] = await Promise.all([
    useProject(),
    useAWSCredentialsProvider(),
    useBootstrap(),
  ]);

  const s3 = new S3Client({
    region: project.config.region,
    credentials: credentials,
  });
  const key = `stackMetadata/app.${project.config.name}/stage.${project.config.stage}/stack.${stackID}.json`;
  Logger.debug("Getting metadata", key, "from", bootstrap.bucket);

  try {
    const result = await s3
      .send(
        new GetObjectCommand({
          Key: key,
          Bucket: bootstrap.bucket,
        })
      )
      .then((result) => json(result.Body as any));
    return result as any[];
  } catch (ex) {
    console.error(ex);
    return [];
  }
}

const MetadataContext = Context.create(async () => {
  const bus = useBus();
  const cache = await useCache();
  const data = await metadata();

  bus.subscribe("stack.status", async (evt) => {
    if (!Stacks.isSuccess(evt.properties.status)) return;
    const meta = await metadataForStack(evt.properties.stackID);
    Logger.debug("Got metadata", meta);
    data[evt.properties.stackID] = meta;
    await cache.write(`metadata.json`, JSON.stringify(data));
    bus.publish("stacks.metadata", data);
    MetadataContext.provide(Promise.resolve(data));
  });

  return data;
});

export const useMetadata = MetadataContext.use;
