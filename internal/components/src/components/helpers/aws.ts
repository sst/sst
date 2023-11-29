import crypto from "crypto";
const bootstrapBuckets: Record<string, Promise<string>> = {};
import {
  SSMClient,
  GetParameterCommand,
  ParameterNotFound,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";

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
              }),
            )
            .catch((err) => {
              if (err instanceof ParameterNotFound) return;
              throw err;
            });

          if (result?.Parameter?.Value) return result.Parameter.Value;

          const name = `sst-bootstrap-${crypto.randomUUID()}`;
          await s3.send(
            new CreateBucketCommand({
              Bucket: name,
            }),
          );
          await ssm.send(
            new PutParameterCommand({
              Name: `/sst/bootstrap`,
              Value: name,
              Type: "String",
            }),
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
};
