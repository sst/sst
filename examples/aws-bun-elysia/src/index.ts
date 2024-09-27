import { Elysia } from "elysia";
import { Resource } from "sst";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client();

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .post("/", async ({ body: { file } }: { body: { file: File } }) => {
    const params = {
      Bucket: Resource.MyBucket.name,
      Key: file.name,
      Body: file,
    };
    const upload = new Upload({
      params,
      client: s3,
    });
    await upload.done();

    return "File uploaded successfully.";
  })
  .get("/latest", async ({ redirect }) => {
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
    return redirect(await getSignedUrl(s3, command));
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
