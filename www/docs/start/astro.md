---
sidebar_label: Astro
title: Use Astro with SST
description: "Create and deploy an Astro site to AWS with SST."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Create and deploy an Astro site to AWS with SST.

</HeadlineText>

---

## Prerequisites

You'll need at least [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). You also need to have an AWS account and [**AWS credentials configured locally**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new site

Create a new Astro site.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-astro@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create astro
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create astro
```

</TabItem>
</MultiPackagerCode>

Now initialize SST in your project root.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd astro-project
npx create-sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
cd astro-project
yarn create sst
```

</TabItem>
<TabItem value="pnpm">

```bash
cd astro-project
pnpm create sst
```

</TabItem>
</MultiPackagerCode>

:::tip Ready to deploy
Your Astro site is now ready to be deployed to AWS! Just run — `npx sst deploy`. But let's take a second to look at how SST makes it easy to add other features to your site.
:::

Start your local dev environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
# Start SST locally
npx sst dev
# Start Astro locally
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
# Start SST locally
yarn sst dev
# Start Astro locally
yarn run dev
```

</TabItem>
<TabItem value="pnpm">

```bash
# Start SST locally
pnpm sst dev
# Start Astro locally
pnpm run dev
```

</TabItem>
</MultiPackagerCode>

---

## 2. Add file uploads

Let's add a file upload feature to our Astro site.

---

#### Add an S3 bucket

Add an S3 bucket to your `sst.config.ts`.

```ts title="sst.config.ts"
const bucket = new Bucket(stack, "public");
```

Bind it to your Astro site.

```diff title="sst.config.ts"
const site = new AstroSite(stack, "site", {
+ bind: [bucket],
});
```

---

#### Generate a presigned URL

To upload a file to S3 we'll generate a presigned URL. Add this to the front matter of `pages/index.astro`.

```ts title="pages/index.astro" {4}
const command = new PutObjectCommand({
  ACL: "public-read",
  Key: crypto.randomUUID(),
  Bucket: Bucket.public.bucketName,
});
const url = await getSignedUrl(new S3Client({}), command);
```

:::tip
With SST we can access our infrastructure in a typesafe way — `Bucket.public.bucketName`. [Learn more](resource-binding.md).
:::

---

#### Add an upload form

Let's add the form. Replace the `Layout` component in `pages/index.astro` with.

```html title="pages/index.astro"
<Layout title="Astro x SST">
  <main>
    <form action="{url}">
      <input name="file" type="file" accept="image/png, image/jpeg" />
      <button type="submit">Upload</button>
    </form>
    <script>
      const form = document.querySelector("form");
      form!.addEventListener("submit", async (e) => {
      	e.preventDefault();

      	const file = form!.file.files?.[0]!;

      	const image = await fetch(form!.action, {
          body: file,
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "Content-Disposition": `attachment; filename="${file.name}"`,
          },
      	});

      	window.location.href = image.url.split("?")[0] || "/";
      });
    </script>
  </main>
</Layout>
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
      handler: "functions/delete.handler",
    },
  },
});
```

Just like our Astro site, we are binding the S3 bucket to our cron job.

---

#### Add a cron function

Add a function to `functions/delete.ts` that'll go through all the files in the bucket and remove them.

```ts title="functions/delete.ts"
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

And that's it. We have a simple Astro site that uploads files to S3 and runs a cron job to delete them!

---

## 4. Deploy to prod

Let's end with deploying our site to production.

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

![Astro site deployed to AWS with SST](/img/start/astro-site-deployed-to-aws-with-sst.png)

:::info
[View the source](https://github.com/serverless-stack/sst/tree/master/examples/quickstart-astro) for this example on GitHub.
:::

---

## Next steps

1. Learn more about SST
   - [`Cron`](../constructs/Cron.md) — Add a cron job to your app
   - [`Bucket`](../constructs/Bucket.md) — Add S3 buckets to your app
   - [`AstroSite`](../constructs/AstroSite.md) — Deploy Astro sites to AWS
   - [Live Lambda Dev](../live-lambda-development.md) — SST's local dev environment
   - [Resource Binding](../resource-binding.md) — Typesafe access to your resources
2. Ready to dive into the details of SST? [**Check out our tutorial**](../learn/index.md).
