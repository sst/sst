import { useBootstrap } from "@core/bootstrap.js";
import { useAWSCredentialsProvider } from "@core/credentials.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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

export async function metadata(stackID: string) {
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
  const data: Record<string, any[]> = await cache
    .read("metadata.json")
    .then((x) => (x ? JSON.parse(x) : {}));

  bus.subscribe("stack.status", async (evt) => {
    if (!Stacks.isFinal(evt.properties.status)) return;
    const meta = await metadata(evt.properties.stackID);
    Logger.debug("Got metadata", meta);
    data[evt.properties.stackID] = meta;
    await cache.write(`metadata.json`, JSON.stringify(data));
    bus.publish("stacks.metadata", data);
    MetadataContext.provide(Promise.resolve(data));
  });

  return data;
});

export const useMetadata = MetadataContext.use;
