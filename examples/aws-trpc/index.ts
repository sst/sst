import {
  APIGatewayEvent,
  CreateAWSLambdaContextOptions,
  awsLambdaRequestHandler,
} from "@trpc/server/adapters/aws-lambda";
import { initTRPC } from "@trpc/server";
import { Resource } from "sst";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import * as crypto from "node:crypto";

const s3 = new S3Client({});

const t = initTRPC
  .context<CreateAWSLambdaContextOptions<APIGatewayEvent>>()
  .create();

const router = t.router({
  // curl --upload-file ./go.mod $(curl -X POST https://4x2wgs2nn4xmbmp6jdsrdhrntq0ypbwq.lambda-url.us-east-1.on.aws/getSignedUrl | jq -r '.result.data')
  getSignedUrl: t.procedure.mutation(async (opts) => {
    const command = new PutObjectCommand({
      Key: crypto.randomUUID(),
      Bucket: Resource.MyBucket.name,
    });

    return await getSignedUrl(s3, command);
  }),
  // curl https://4x2wgs2nn4xmbmp6jdsrdhrntq0ypbwq.lambda-url.us-east-1.on.aws/getLatestFile
  getLatestFile: t.procedure.query(async (opts) => {
    const objects = await s3.send(
      new ListObjectsV2Command({
        Bucket: Resource.MyBucket.name,
      }),
    );
    const latestFile = objects.Contents!.sort(
      (a, b) =>
        (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
    )[0];
    const command = new GetObjectCommand({
      Key: latestFile.Key,
      Bucket: Resource.MyBucket.name,
    });
    return await getSignedUrl(s3, command);
  }),
});
export type Router = typeof router;

export const handler = awsLambdaRequestHandler({
  router: router,
  createContext: (opts) => opts,
});
