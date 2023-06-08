---
sidebar_label: Remix
title: Use Remix with SST
description: "Create and deploy a Remix app to AWS with SST."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Create and deploy a Remix app to AWS with SST.

</HeadlineText>

---

## Prerequisites

You'll need at least [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). You also need to have an AWS account and [**AWS credentials configured locally**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new Remix app.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-remix@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create remix
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create remix
```

</TabItem>
</MultiPackagerCode>

Now initialize SST in your project root.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd my-remix-app
npx create-sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
cd my-remix-app
yarn create sst
```

</TabItem>
<TabItem value="pnpm">

```bash
cd my-remix-app
pnpm create sst
```

</TabItem>
</MultiPackagerCode>

:::tip Ready to deploy
Your Remix app is now ready to be deployed to AWS! Just run — `npx sst deploy`. But let's take a second to look at how SST makes it easy to add other features to your app.
:::

Start your local dev environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
# Start SST locally
npx sst dev
# Start Remix locally
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
# Start SST locally
yarn sst dev
# Start Remix locally
yarn run dev
```

</TabItem>
<TabItem value="pnpm">

```bash
# Start SST locally
pnpm sst dev
# Start Remix locally
pnpm run dev
```

</TabItem>
</MultiPackagerCode>

---

## 2. Add file uploads

Let's add a file upload feature to our Remix app.

---

#### Add an S3 bucket

Add an S3 bucket to your `sst.config.ts`.

```ts title="sst.config.ts"
const bucket = new Bucket(stack, "public");
```

Let your Remix app access the bucket.

```diff title="sst.config.ts"
const site = new RemixSite(stack, "site", {
+ permissions: [bucket],
+ environment: {
+   BUCKET_NAME: bucket.bucketName,
+ },
});
```

---

#### Generate a presigned URL

To upload a file to S3 we'll generate a presigned URL. Add this to `app/_index.tsx`.

```ts title="app/_index.tsx" {5}
export async function loader() {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: crypto.randomUUID(),
    Bucket: process.env.BUCKET_NAME,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  return json({ url });
}
```

---

#### Add an upload form

Let's add the form. Replace the `Index` component in `app/_index.tsx` with.

```tsx title="app/_index.tsx"
export default function Index() {
  const data = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Welcome to Remix</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const file = (e.target as HTMLFormElement).file.files?.[0]!;

          const image = await fetch(data.url, {
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
    </div>
  );
}
```

This will upload an image and redirect to it!

---

## 3. Add a cron job

Next, we'll add a cron job to remove the uploaded files every day. Add this to `sst.config.ts`.

```ts title="sst.config.ts"
new Cron(stack, "cron", {
  schedule: "rate(1 minute)",
  job: {
    function: {
      permissions: [bucket],
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      handler: "functions/delete.handler",
    },
  },
});
```

Just like our Remix app, we are letting our cron job access the S3 bucket.

---

#### Add a cron function

Add a function to `functions/delete.ts` that'll go through all the files in the bucket and remove them.

```ts title="functions/delete.ts"
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
```

And that's it. We have a simple Remix app that uploads files to S3 and runs a cron job to delete them!

---

## 4. Deploy to prod

Let's end with deploying our app to production.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst deploy --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst deploy --stage prod
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst deploy --stage prod
```

</TabItem>
</MultiPackagerCode>

![Remix app deployed to AWS with SST](/img/start/remix-app-deployed-to-aws-with-sst.png)

:::info
[View the source](https://github.com/serverless-stack/sst/tree/master/examples/quickstart-remix) for this example on GitHub.
:::

---

## Next steps

1. Learn more about SST
   - [`Cron`](../constructs/Cron.md) — Add a cron job to your app
   - [`Bucket`](../constructs/Bucket.md) — Add S3 buckets to your app
   - [`RemixSite`](../constructs/RemixSite.md) — Deploy Remix apps to AWS
   - [Live Lambda Dev](../live-lambda-development.md) — SST's local dev environment
2. Ready to dive into the details of SST? [**Check out our tutorial**](../learn/index.md).
