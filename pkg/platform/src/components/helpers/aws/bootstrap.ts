import {
  SSMClient,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketVersioningCommand,
} from "@aws-sdk/client-s3";
export type {} from "@smithy/types";
import { HASH_CHARS, hashNumberToString } from "../naming";

const VERSION = 1;

interface BootstrapData {
  version: number;
  asset: string;
  state: string;
}

const bootstrapBuckets: Record<string, Promise<BootstrapData>> = {};

export const bootstrap = {
  forRegion(region: string): Promise<BootstrapData> {
    if (region in bootstrapBuckets) {
      return bootstrapBuckets[region]!;
    }

    const ssm = new SSMClient({
      region,
    });
    const s3 = new S3Client({
      region,
    });
    try {
      const bucket = (async () => {
        const result = await ssm
          .send(
            new GetParameterCommand({
              Name: `/sst/bootstrap`,
            }),
          )
          .catch((err) => {
            if (err instanceof ParameterNotFound) return;
            throw err;
          });

        if (result?.Parameter?.Value) {
          try {
            const parsed = JSON.parse(result.Parameter.Value);
            return parsed;
          } catch (ex) {}
        }

        // Generate a bootstrap bucket suffix number
        const suffixLength = 12;
        const minNumber = Math.pow(HASH_CHARS.length, suffixLength);
        const numberSuffix = Math.floor(Math.random() * minNumber) + minNumber;
        const rand = hashNumberToString(numberSuffix, suffixLength);
        const asset = `sst-asset-${rand}`;
        const state = `sst-state-${rand}`;
        const data = {
          asset,
          state,
          version: VERSION,
        };
        await s3.send(
          new CreateBucketCommand({
            Bucket: asset,
          }),
        );
        await s3.send(
          new CreateBucketCommand({
            Bucket: state,
          }),
        );
        await s3.send(
          new PutBucketVersioningCommand({
            Bucket: asset,
            VersioningConfiguration: {
              Status: "Enabled",
            },
          }),
        );
        await ssm.send(
          new PutParameterCommand({
            Name: `/sst/bootstrap`,
            Value: JSON.stringify(data),
            Type: "String",
          }),
        );
        return asset;
      })();

      return (bootstrapBuckets[region] = bucket);
    } finally {
      s3.destroy();
      ssm.destroy();
    }
  },
};
