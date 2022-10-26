import { useBootstrap } from "@core/bootstrap.js";
import {
  useAWSCredentials,
  useAWSCredentialsProvider,
} from "@core/credentials.js";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { json } from "stream/consumers";
import { useCache } from "@core/cache.js";
import { Context } from "@serverless-stack/node/context/index.js";
import { useBus } from "@core/bus.js";
import { Stacks } from "./index.js";
import { Logger } from "@core/logger.js";
import { useProject } from "@core/app.js";

declare module "@core/bus.js" {
  export interface Events {
    "stacks.metadata": Record<string, any[]>;
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
    region: project.region,
    credentials: credentials,
  });

  const key = `stackMetadata/app.${project.name}/stage.${project.stage}/`;
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
  return result;
}

export async function metadataForStack(stackID: string) {
  const [project, credentials, bootstrap] = await Promise.all([
    useProject(),
    useAWSCredentialsProvider(),
    useBootstrap(),
  ]);

  const s3 = new S3Client({
    region: project.region,
    credentials: credentials,
  });
  const key = `stackMetadata/app.${project.name}/stage.${project.stage}/stack.${stackID}.json`;
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
  const data: Record<string, any[]> = await metadata();

  bus.subscribe("stack.status", async (evt) => {
    if (!Stacks.isFinal(evt.properties.status)) return;
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

export const useFunctions = Context.memo(async () => {
  const metadata = await useMetadata();
  const result: Record<string, any> = {};
  for (const [_, meta] of Object.entries(metadata)) {
    for (const item of meta) {
      if (item.type === "Function") {
        result[item.data.localId] = item;
      }
    }
  }
  return result;
});
