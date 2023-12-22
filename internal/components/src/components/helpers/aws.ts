const bootstrapBuckets: Record<string, Promise<string>> = {};
import {
  SSMClient,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";
export type {} from "@smithy/types";
import { output } from "@pulumi/pulumi";
import { lazy } from "../../util/lazy";
import { HASH_CHARS, hashNumberToString, sanitizeToPascalCase } from "./naming";

const useProviderCache = lazy(() => new Map<string, aws.Provider>());
const useClientCache = lazy(() => new Map<string, any>());

type ClientOptions = {
  region?: string;
  retrableErrors?: string[];
};

export const AWS = {
  bootstrap: {
    forRegion(region: string) {
      if (bootstrapBuckets[region]) {
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
              })
            )
            .catch((err) => {
              if (err instanceof ParameterNotFound) return;
              throw err;
            });

          if (result?.Parameter?.Value) return result.Parameter.Value;

          // Generate a bootstrap bucket suffix number
          const suffixLength = 12;
          const minNumber = Math.pow(HASH_CHARS.length, suffixLength);
          const numberSuffix =
            Math.floor(Math.random() * minNumber) + minNumber;
          const name = `sst-bootstrap-${hashNumberToString(
            numberSuffix,
            suffixLength
          )}`;
          await s3.send(
            new CreateBucketCommand({
              Bucket: name,
            })
          );
          await ssm.send(
            new PutParameterCommand({
              Name: `/sst/bootstrap`,
              Value: name,
              Type: "String",
            })
          );
          return name;
        })();

        return (bootstrapBuckets[region] = bucket);
      } finally {
        s3.destroy();
        ssm.destroy();
      }
    },
  },
  useProvider: (region: aws.Region) => {
    const cache = useProviderCache();
    const existing = cache.get(region);
    if (existing) return existing;

    const provider = new aws.Provider(`AwsProvider.sst.${region}`, {
      region,
      defaultTags: {
        tags: output(aws.getDefaultTags()).apply((result) => result.tags),
      },
    });
    cache.set(region, provider);
    return provider;
  },
  useClient: <C extends any>(
    client: new (config: any) => C,
    opts?: ClientOptions
  ) => {
    const cache = useClientCache();
    const existing = cache.get(client.name);
    if (existing) return existing as C;

    const printNoInternet = (() => {
      let lastPrinted = 0;
      return () => {
        const now = Date.now();
        if (now - lastPrinted > 5000) {
          console.log("Waiting for internet connection...");
          lastPrinted = now;
        }
      };
    })();
    const result = new client({
      region: opts?.region,
      retryStrategy: new StandardRetryStrategy(async () => 10000, {
        retryDecider: (e: any) => {
          // Handle no internet connection => retry
          if (e.code === "ENOTFOUND") {
            printNoInternet();
            return true;
          }

          // Handle throttling errors => retry
          if (
            [
              "ThrottlingException",
              "Throttling",
              "TooManyRequestsException",
              "OperationAbortedException",
              "TimeoutError",
              "NetworkingError",
              ...(opts.retrableErrors ?? []),
            ].includes(e.name)
          ) {
            return true;
          }

          return false;
        },
        delayDecider: (_, attempts) => {
          return Math.min(1.5 ** attempts * 100, 5000);
        },
        // AWS SDK v3 has an idea of "retry tokens" which are used to
        // prevent multiple retries from happening at the same time.
        // This is a workaround to disable that.
        retryQuota: {
          hasRetryTokens: () => true,
          releaseRetryTokens: () => {},
          retrieveRetryTokens: () => 1,
        },
      }),
    });
    cache.set(client.name, result);
    return result;
  },
};
