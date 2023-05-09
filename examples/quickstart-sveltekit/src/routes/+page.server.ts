import crypto from "crypto";
import { Bucket } from "sst/node/bucket";
import type { PageServerLoad } from "./$types";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const load = (async () => {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: crypto.randomUUID(),
    Bucket: Bucket.public.bucketName,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  return { url };
}) satisfies PageServerLoad;
