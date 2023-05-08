---
title: File Uploads
description: "Add S3 file uploads to your SST app."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Add S3 file uploads to your SST app.

</HeadlineText>

---

## Overview

To allow your users to upload files to your app you'll need to:

1. Create an S3 bucket
2. Bind your frontend to the bucket
3. Generate a presigned URL for the upload
4. Upload the file by making a request to the URL

Let's look at this in detail!

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

---

## Add an S3 bucket

Next, add an S3 bucket to your stacks. This will allow you to store the uploaded files.

```ts title="stacks/Default.ts"
const bucket = new Bucket(stack, "public");
```

Make sure to import the [`Bucket`](constructs/Bucket.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Bucket, StackContext, NextjsSite } from "sst/constructs";
```

---

## Bind the bucket

After adding the bucket, bind your Next.js app to it.

```diff title="stacks/Default.ts"
const site = new NextjsSite(stack, "site", {
  path: "packages/web",
+ bind: [bucket],
});
```

This allows Next.js app to access our S3 bucket.

---

## Generate a presigned URL

When a user uploads a file, we want to generate a presigned URL that allows them to upload the file directly to S3. We will do this using the AWS SDK.

```ts title="functions/web/pages/index.ts" {5}
export async function getServerSideProps() {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: crypto.randomUUID(),
    Bucket: Bucket.public.bucketName,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  return { props: { url } };
}
```

The above generates a presigned URL that allows `public-read` access to the uploaded files. You can change the ACL to `private` or `authenticated-read` if you prefer.

---

#### Add the imports

Import the required packages.

```ts title="functions/web/pages/index.ts"
import crypto from "crypto";
import { Bucket } from "sst/node/bucket";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
```

Make sure to install them as well.

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## Create an upload form

Finally, we can create a form that allows users to upload a file:

```tsx title="functions/web/pages/index.tsx"
export default function Home({ url }: { url: string }) {
  return (
    <main>
      <form
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
        <button type="submit">Upload</button>
      </form>
    </main>
  );
}
```

This form uploads the file directly to S3 and redirects to the file's URL.

---

That's it! You now know how to add file uploads with S3 to your SST app.
