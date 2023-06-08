import {
  S3Client,
  ListObjectsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export async function handler() {
  const client = new S3Client({});

  const list = await client.send(
    new ListObjectsCommand({
      Bucket: process.env.BUCKET_NAME,
    })
  );

  await Promise.all(
    (list.Contents || []).map((file) =>
      client.send(
        new DeleteObjectCommand({
          Key: file.Key,
          Bucket: process.env.BUCKET_NAME,
        })
      )
    )
  );
}
