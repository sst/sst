---
sidebar_label: Svelte
title: Use SvelteKit with SST
description: "Create and deploy a SvelteKit app to AWS with SST."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Create and deploy a SvelteKit app to AWS with SST.

</HeadlineText>

---

## Prerequisites

You'll need at least [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). You also need to have an AWS account and [**AWS credentials configured locally**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new SvelteKit app.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-svelte@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create svelte
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create svelte
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
Your SvelteKit app is now ready to be deployed to AWS! Just run — `npx sst deploy`. But let's take a second to look at how SST makes it easy to add other features to your app.
:::

Start your local dev environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
# Start SST locally
npx sst dev
# Start Svelte locally
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
# Start SST locally
yarn sst dev
# Start Svelte locally
yarn run dev
```

</TabItem>
<TabItem value="pnpm">

```bash
# Start SST locally
pnpm sst dev
# Start Svelte locally
pnpm run dev
```

</TabItem>
</MultiPackagerCode>

---

## 2. Add file uploads

Let's add a file upload feature to our Svelte app.

---

#### Add an S3 bucket

Add an S3 bucket to your `sst.config.ts`.

```ts title="sst.config.ts"
const bucket = new Bucket(stack, "public");
```

Bind it to your Svelte app.

```diff title="sst.config.ts"
const site = new SvelteKitSite(stack, "site", {
+ bind: [bucket],
});
```

---

#### Generate a presigned URL

To upload a file to S3 we'll generate a presigned URL. Add this to `src/routes/+page.server.ts`.

```ts title="src/routes/+page.server.ts" {5}
export const load = (async () => {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Key: crypto.randomUUID(),
    Bucket: Bucket.public.bucketName,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  return { url };
}) satisfies PageServerLoad;
```

:::tip
With SST we can access our infrastructure in a typesafe way — `Bucket.public.bucketName`. [Learn more](resource-binding.md).
:::

---

#### Add an upload form

Let's add the form. Replace our `src/routes/+page.svelte` with.

```tsx title="src/routes/+page.svelte"
<section>
  <form on:submit|preventDefault={handleSubmit}>
    <input name="file" type="file" accept="image/png, image/jpeg" />
    <button type="submit">Upload</button>
  </form>
</section>
```

Add the upload handler.

```ts title="src/routes/+page.svelte"
const handleSubmit = async (e: SubmitEvent) => {
  const formData = new FormData(e.target as HTMLFormElement);
  const file = formData.get("file") as File;

  const image = await fetch(data.url, {
    body: file,
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${file.name}"`,
    },
  });

  window.location.href = image.url.split("?")[0];
};
```

:::note
We need to set `prerender` to `false` in `src/routes/+page.ts` since we want to generate the presigned URL on page load.
:::

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

Just like our SvelteKit app, we are binding the S3 bucket to our cron job.

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

And that's it. We have a simple SvelteKit app that uploads files to S3 and runs a cron job to delete them!

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

![SvelteKit app deployed to AWS with SST](/img/start/sveltekit-app-deployed-to-aws-with-sst.png)

:::info
[View the source](https://github.com/serverless-stack/sst/tree/master/examples/quickstart-sveltekit) for this example on GitHub.
:::

---

## Next steps

1. Learn more about SST
   - [`Cron`](../constructs/Cron.md) — Add a cron job to your app
   - [`Bucket`](../constructs/Bucket.md) — Add S3 buckets to your app
   - [`SvelteKitSite`](../constructs/SvelteKitSite.md) — Deploy SvelteKit apps to AWS
   - [Live Lambda Dev](../live-lambda-development.md) — SST's local dev environment
   - [Resource Binding](../resource-binding.md) — Typesafe access to your resources
2. Ready to dive into the details of SST? [**Check out our tutorial**](../learn/index.md).
