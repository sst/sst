import { Elysia } from "elysia";
import { Resource } from "sst";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client();

new Elysia()
  .get("/", async () => {
    console.log(process.env);
    const command = new PutObjectCommand({
      Key: crypto.randomUUID(),
      Bucket: Resource.Bucket.name,
    });

    return getSignedUrl(s3, command);
  })
  .get("/latest", async (ctx) => {
    const objects = await s3.send(
      new ListObjectsV2Command({
        Bucket: Resource.Bucket.name,
      }),
    );
    const latestFile = objects.Contents!.sort(
      (a, b) =>
        (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
    )[0];
    const command = new GetObjectCommand({
      Key: latestFile.Key,
      Bucket: Resource.Bucket.name,
    });
    ctx.set.redirect = await getSignedUrl(s3, command);
  })
  .listen(3000);

console.log("Listening on http://0.0.0.0:3000");
