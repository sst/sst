const bootstrapBuckets: Record<string, Promise<string>> = {};
import {
  SSMClient,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
export type {} from "@smithy/types";
import { HASH_CHARS, hashNumberToString } from "../naming";

export const bootstrap = {
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
        const numberSuffix = Math.floor(Math.random() * minNumber) + minNumber;
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
};
