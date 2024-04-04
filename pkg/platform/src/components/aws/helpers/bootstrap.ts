import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketVersioningCommand,
} from "@aws-sdk/client-s3";
export type {} from "@smithy/types";
import { PRETTY_CHARS, hashNumberToPrettyString } from "../../naming";
import { useClient } from "./client";

const VERSION = 1;
const SSM_NAME = `/sst/bootstrap/asset`;

interface BootstrapData {
  version: number;
  bucket: string;
}

const bootstrapBuckets: Record<string, Promise<BootstrapData>> = {};

export const bootstrap = {
  forRegion(region: string): Promise<BootstrapData> {
    if (region in bootstrapBuckets) {
      return bootstrapBuckets[region]!;
    }

    const ssm = useClient(SSMClient, { region });
    const s3 = useClient(S3Client, { region });

    try {
      const bucket = (async () => {
        // check if already bootstrapped
        const existingData = await getSsmData();
        if (existingData) return existingData;

        // bootstrap
        const rand = generateBucketSuffix();
        const bucketName = `sst-asset-${rand}`;
        const data = {
          version: VERSION,
          bucket: bucketName,
        };
        await createAssetBucket();
        await createSsmData();
        return data;

        async function getSsmData() {
          const result = await ssm
            .send(new GetParameterCommand({ Name: SSM_NAME }))
            .catch((err) => {
              if (err.name === "ParameterNotFound") return;
              throw err;
            });

          // parse value
          if (result?.Parameter?.Value) {
            try {
              return JSON.parse(result.Parameter.Value);
            } catch (ex) {}
          }
        }

        function generateBucketSuffix() {
          const suffixLength = 12;
          const minNumber = Math.pow(PRETTY_CHARS.length, suffixLength);
          const numberSuffix =
            Math.floor(Math.random() * minNumber) + minNumber;
          return hashNumberToPrettyString(numberSuffix, suffixLength);
        }

        async function createAssetBucket() {
          await s3.send(
            new CreateBucketCommand({
              Bucket: bucketName,
            }),
          );
          await s3.send(
            new PutBucketVersioningCommand({
              Bucket: bucketName,
              VersioningConfiguration: {
                Status: "Enabled",
              },
            }),
          );
        }

        async function createSsmData() {
          await ssm.send(
            new PutParameterCommand({
              Name: SSM_NAME,
              Value: JSON.stringify(data),
              Type: "String",
            }),
          );
        }
      })();

      return (bootstrapBuckets[region] = bucket);
    } finally {
      s3.destroy();
      ssm.destroy();
    }
  },
};
