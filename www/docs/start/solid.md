---
sidebar_label: Solid
title: Use SolidStart with SST
description: "Create and deploy a SolidStart app to AWS with SST."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Create and deploy a SolidStart app to AWS with SST.

</HeadlineText>

---

## Prerequisites

You'll need at least [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). You also need to have an AWS account and [**AWS credentials configured locally**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new SolidStart app.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-solid@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create solid
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create solid
```

</TabItem>
</MultiPackagerCode>

Now initialize SST in your project root.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create sst
```

</TabItem>
</MultiPackagerCode>

:::tip Ready to deploy
Your SolidStart app is now ready to be deployed to AWS! Just run — `npx sst deploy`. But let's take a second to look at how SST makes it easy to add other features to your app.
:::

Start your local dev environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
# Start SST locally
npx sst dev
# Start Solid locally
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
# Start SST locally
yarn sst dev
# Start Solid locally
yarn run dev
```

</TabItem>
<TabItem value="pnpm">

```bash
# Start SST locally
pnpm sst dev
# Start Solid locally
pnpm run dev
```

</TabItem>
</MultiPackagerCode>

---

## 2. Add file uploads

Let's add a file upload feature to our Solid app.

---

#### Add an S3 bucket

Add an S3 bucket to your `sst.config.ts`.

```ts title="sst.config.ts"
const bucket = new Bucket(stack, "public");
```

Bind it to your Solid app.

```diff title="sst.config.ts"
const site = new SolidStartSite(stack, "site", {
+ bind: [bucket],
});
```

---

#### Generate a presigned URL

To upload a file to S3 we'll generate a presigned URL. Add this to `src/routes/index.tsx`.

```ts title="src/routes/index.tsx" {6}
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
```

:::tip
With SST we can access our infrastructure in a typesafe way — `Bucket.public.bucketName`. [Learn more](resource-binding.md).
:::

---

#### Add an upload form

Let's add the form. Replace the Home component in `src/routes/index.tsx` with.

```tsx title="src/routes/index.tsx"
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
```

This will upload an image and redirect to it!

---

## 3. Add a cron job

Next, we'll add a cron job to remove the uploaded files every day. Add this to `sst.config.ts`.

```ts title="sst.config.ts" {5}
new Cron(stack, "cron", {
  schedule: "rate(1 day)",
  job: {
    function: {
      bind: [bucket],
      handler: "src/functions/delete.handler",
    },
  },
});
```

Just like our SolidStart app, we are binding the S3 bucket to our cron job.

---

#### Add a cron function

Add a function to `src/functions/delete.ts` that'll go through all the files in the bucket and remove them.

```ts title="src/functions/delete.ts"
export async function handler() {
  const client = new S3Client({});

  const list = await client.send(
    new ListObjectsCommand({
      Bucket: Bucket.public.bucketName,
    })
  );

  await Promise.all(
    (list.Contents || []).map((file) =>
      client.send(
        new DeleteObjectCommand({
          Key: file.Key,
          Bucket: Bucket.public.bucketName,
        })
      )
    )
  );
}
```

And that's it. We have a simple SolidStart app that uploads files to S3 and runs a cron job to delete them!

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

![SolidStart app deployed to AWS with SST](/img/start/solidstart-app-deployed-to-aws-with-sst.png)

:::info
[View the source](https://github.com/serverless-stack/sst/tree/master/examples/quickstart-solidstart) for this example on GitHub.
:::

---

## Next steps

1. Learn more about SST
   - [`Cron`](../constructs/Cron.md) — Add a cron job to your app
   - [`Bucket`](../constructs/Bucket.md) — Add S3 buckets to your app
   - [`SolidStartSite`](../constructs/SolidStartSite.md) — Deploy SolidStart apps to AWS
   - [Live Lambda Dev](../live-lambda-development.md) — SST's local dev environment
   - [Resource Binding](../resource-binding.md) — Typesafe access to your resources
2. Ready to dive into the details of SST? [**Check out our tutorial**](../learn/index.md).
