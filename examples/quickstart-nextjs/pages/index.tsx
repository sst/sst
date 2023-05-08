import crypto from "crypto";
import { Inter } from "next/font/google";
import { Bucket } from "sst/node/bucket";
import styles from "@/styles/Home.module.css";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const inter = Inter({ subsets: ["latin"] });

export async function getServerSideProps() {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: crypto.randomUUID(),
    Bucket: Bucket.public.bucketName,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  return { props: { url } };
}

export default function Home({ url }: { url: string }) {
  return (
    <main className={styles.main}>
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();

          const file = (e.target as HTMLFormElement).file.files?.[0]!;

          const image = await fetch(url, {
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
        <button type="submit" className={inter.className}>
          Upload
        </button>
      </form>
    </main>
  );
}
