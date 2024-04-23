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
import {
  ECRClient,
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr";
export type {} from "@smithy/types";
import { PRETTY_CHARS, hashNumberToPrettyString } from "../../naming";
import { useClient } from "./client";

const VERSION = 1;
const SSM_NAME = `/sst/bootstrap/asset`;

interface BootstrapData {
  version: number;
  bucket: string;
  ecr: {
    registryId: string;
    url: string;
  };
}

const bootstrapBuckets: Record<string, Promise<BootstrapData>> = {};

export const bootstrap = {
  forRegion(region: string): Promise<BootstrapData> {
    if (region in bootstrapBuckets) {
      return bootstrapBuckets[region]!;
    }

    const ssm = useClient(SSMClient, { region });
    const s3 = useClient(S3Client, { region });
    const ecr = useClient(ECRClient, { region });

    try {
      const bucket = (async () => {
        // check if already bootstrapped
        const data = await getSsmData();
        if (data.bucket && data.ecr && data.version) return data;

        // bootstrap
        if (!data.bucket) {
          data.bucket = await createBucket();
        }
        if (!data.ecr) {
          data.ecr = await createEcr();
        }
        data.version = VERSION;
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

          return {};
        }

        async function createBucket() {
          // Generate bucket name
          const suffixLength = 12;
          const minNumber = Math.pow(PRETTY_CHARS.length, suffixLength);
          const numberSuffix =
            Math.floor(Math.random() * minNumber) + minNumber;
          const hashSuffix = hashNumberToPrettyString(
            numberSuffix,
            suffixLength,
          );
          const bucketName = `sst-asset-${hashSuffix}`;

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
          return bucketName;
        }

        async function createEcr() {
          try {
            const ret = await ecr.send(
              // @ts-ignore
              new CreateRepositoryCommand({
                repositoryName: "sst-asset",
              }),
            );
            return {
              registryId: ret.repository?.registryId!,
              url: ret.repository?.repositoryUri!,
            };
          } catch (e: any) {
            if (e.name === "RepositoryAlreadyExistsException")
              return await getEcr();
            throw e;
          }
        }

        async function getEcr() {
          const ret = await ecr.send(
            // @ts-ignore
            new DescribeRepositoriesCommand({
              repositoryNames: ["sst-asset"],
            }),
          );
          return {
            registryId: ret.repositories![0].registryId!,
            url: ret.repositories![0].repositoryUri!,
          };
        }

        async function createSsmData() {
          await ssm.send(
            new PutParameterCommand({
              Name: SSM_NAME,
              Value: JSON.stringify(data),
              Type: "String",
              Overwrite: true,
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
