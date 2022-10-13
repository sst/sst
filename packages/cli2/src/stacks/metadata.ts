import { useBootstrap } from "../bootstrap/index.js";
import { useAWSCredentialsProvider } from "../credentials";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { useConfig } from "../config/index.js";
import { json } from "stream/consumers";
import { useCache } from "../cache/cache.js";
import { Context } from "@serverless-stack/node/context/index.js";
import { useBus } from "../bus/index.js";
import { Stacks } from "./index.js";
import { Logger } from "../logger/index.js";

declare module "../bus/index.js" {
  export interface Events {
    "stacks.metadata": Record<string, any[]>;
  }
}

export async function metadata(stackID: string) {
  const [config, credentials, bootstrap] = await Promise.all([
    useConfig(),
    useAWSCredentialsProvider(),
    useBootstrap(),
  ]);

  const s3 = new S3Client({
    region: config.region,
    credentials: credentials,
  });
  const key = `stackMetadata/app.${config.name}/stage.${config.stage}/stack.${stackID}.json`;
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

export const useMetadata = Context.memo(async () => {
  const bus = useBus();
  const cache = useCache();
  const data: Record<string, any[]> = await cache
    .read("metadata.json")
    .then((x) => (x ? JSON.parse(x) : {}));

  bus.subscribe("stack.status", async (evt) => {
    if (!Stacks.isFinal(evt.properties.status)) return;
    const meta = await metadata(evt.properties.stackID);
    data[evt.properties.stackID] = meta;
    await cache.write(`metadata.json`, JSON.stringify(data));
    bus.publish("stacks.metadata", data);
  });

  return data;
});
