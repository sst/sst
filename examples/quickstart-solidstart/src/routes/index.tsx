import crypto from "crypto";
import { Bucket } from "sst/node/bucket";
import { useRouteData } from "solid-start";
import { createServerData$ } from "solid-start/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export function routeData() {
  return createServerData$(async () => {
    const command = new PutObjectCommand({
      ACL: "public-read",
      Key: crypto.randomUUID(),
      Bucket: Bucket.public.bucketName,
    });
    return await getSignedUrl(new S3Client({}), command);
  });
}

export default function Home() {
  const url = useRouteData<typeof routeData>();

  return (
    <main>
      <h1>Hello world!</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const file = (e.target as HTMLFormElement).file.files?.[0]!;

          const image = await fetch(url() as string, {
            body: file,
            method: "PUT",
            headers: {
              "Content-Type": file.type,
              "Content-Disposition": `attachment; filename="${file.name}"`,
            },
          });

          window.location.href = image.url.split("?")[0];
        }}
      >
        <input name="file" type="file" accept="image/png, image/jpeg" />
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}
