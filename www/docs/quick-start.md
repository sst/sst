---
id: quick-start
title: Quick Start
description: "Take SST for a spin and create your project."
---

import config from "../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

Take SST for a spin and create your first project.

</HeadlineText>

---

```bash
npx create-next-app@latest
```

Initialize SST.

```bash
npx create-sst@latest
npx sst dev
```

Let's add a file upload feature to our app.

Add an S3 bucket to your `sst.config.ts`.

```ts title="sst.config.ts"
const bucket = new Bucket(ctx.stack, "public", {
  cors: true,
});
```

Bind it to your Next.js app.

```diff title="sst.config.ts"
const site = new NextjsSite(ctx.stack, "site", {
  path: ".",
+ bind: [bucket],
});
```

To upload a file to S3 we'll add an API `pages/api/upload.ts` to generate a presigned URL and redirect to it.

```ts title="pages/api/upload.ts" {7}
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Bucket: Bucket.public.bucketName,
    Key: request.query.name as string,
  });
  const url = await getSignedUrl(new S3Client({}), command);

  response.redirect(url);
}
```

Thanks to [Resource Binding](resource-binding.md) we can access our S3 bucket in a typesafe way in our Next.js app — `Bucket.public.bucketName`.

Let's add the form. Replace your `pages/index.tsx` with.

```tsx title="pages/index.tsx"
export default function Home() {
  return (
    <main>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const file = (e.target as HTMLFormElement).file.files?.[0]!;
          const { url } = await fetch(`/api/upload?name=${file.name}`, {
            body: file,
            method: "PUT",
            headers: { "Content-Type": file.type },
          });

          window.location.href = url.split("?")[0];
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

Next, we'll add a cron job to `sst.config.ts` that'll remove the uploaded files every day.

```ts title="sst.config.ts" {5}
new Cron(ctx.stack, "cron", {
  schedule: "rate(1 day)",
  job: {
    function: {
      bind: [bucket],
      handler: "functions/delete.handler",
    },
  },
});
```

Just like our Next.js app, we are binding our cron job to the S3 bucket.

Add a function to `functions/delete.ts` that'll go through all the files in the bucket and remove it.

```ts title="functions/delete.ts"
export async function handler() {
  const client = new S3Client({});

  const list = await client.send(
    new ListObjectsCommand({
      Bucket: Bucket.public.bucketName,
    })
  );

  await Promise.all(
    (list.Contents || []).map(async (file) => {
      await client.send(
        new DeleteObjectCommand({
          Key: file.Key,
          Bucket: Bucket.public.bucketName,
        })
      );
    })
  );
}
```

And that's it. We have a simple Next.js app that uploads files to S3 and runs a cron job to delete them!

Let's end with deploying it to prod.

```bash
npx sst deploy --stage prod
```

---

---

---

---

---

## 0. Prerequisites

SST is built with Node, so make sure your local machine has it installed; at least [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/).

### AWS credentials

You also need to have an AWS account and AWS credentials configured locally. If you haven't already, [**follow these steps**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new SST app using the [`create-sst`](packages/create-sst.md) CLI.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest my-sst-app
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst my-sst-app
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create sst my-sst-app
```

</TabItem>
</MultiPackagerCode>

### Install dependencies

Next install the dependencies.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd my-sst-app
npm install
```

</TabItem>
<TabItem value="yarn">

```bash
cd my-sst-app
yarn
```

</TabItem>
<TabItem value="pnpm">

```bash
cd my-sst-app
pnpm install
```

</TabItem>
</MultiPackagerCode>

---

## 2. Start local environment

Then start the [Live Lambda](live-lambda-development.md) local development environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst dev
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst dev
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst dev
```

</TabItem>
</MultiPackagerCode>

The first time you run this command in a project, you'll be prompted to enter a default stage name to use.

---

### Pick a stage

SST uses the stage names to namespace your resources.

```
Look like you’re running sst for the first time in this directory. Please enter
a stage name you’d like to use locally. Or hit enter to use the one based on
your AWS credentials (Jay):
```

Just hit **Enter** to select the default one.

<details>
<summary>Behind the scenes</summary>

The name spaced resources lets SST deploy multiple environments of the same app to the same AWS account. So you and your teammates can work together.

The stage name will be stored locally in a `.sst/` directory. It's automatically ignored from Git.

</details>

The initial deploy can take a few minutes. It will deploy your app to AWS, and also setup the infrastructure to support your local development environment.

Once complete, you'll see something like this.

```
➜  App:     my-sst-app
   Stage:   Jay
   Console: https://console.sst.dev/my-sst-app/Jay/local

✔  Deployed:
   API
   ApiEndpoint: https://bmodl6wkkj.execute-api.us-east-1.amazonaws.com
```

Now our app has been **deployed** to **AWS** and it's **connected** to our **local machine**!

---

### Open the console

The `sst dev` command also powers a web based dashboard, called the [SST Console](console.md). Head over to the URL above or simply — **<ConsoleUrl url={config.console} />**

Select the **API** tab on the left, and click **Send**. This will make a request to the endpoint in AWS.

![SST Console API tab](/img/quick-start/sst-console-api.png)

You should see a `Hello world` message in the response.

---

## 3. Make a change

Let's make a change to our API and see what the workflow is like. Replace the following in `packages/functions/src/lambda.ts`.

```diff title="packages/functions/src/lambda.ts" {3-4}
export const handler = ApiHandler(async (_evt) => {
  return {
-   body: `Hello world. The time is ${Time.now()}`,
+   body: "This is my awesome API!",
  };
});
```

Switch back to the SST Console, and click **Send** again.

![SST Console API tab](/img/quick-start/sst-console-api-after-change.png)

You should see the updated message in the response.

---

## 4. Deploy to prod

Once you are done working on your app locally, you are ready to go to production. We'll use the `sst deploy` command for this.

We don't want to use the same _stage_ as our local environment since we want to separate our dev and prod environments. So we'll run the `sst deploy` command with the `--stage` option.

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

This will take a few minutes to run and will create a complete new version of your app. Once complete you'll notice these outputs.

```bash {3}
✔  Deployed:
   API
   ApiEndpoint: https://2q0mwp6r8d.execute-api.us-east-1.amazonaws.com
```

You'll notice this is a completely new API endpoint.

You can also add [**custom domains**](constructs/Api.md#custom-domains) to your app, but we'll cover that in a separate tutorial.

---

## 5. Remove the app

Finally to wrap this up, you can remove all your app all its resources from AWS.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx sst remove
npx sst remove --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn sst remove
yarn sst remove --stage prod
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm sst remove
pnpm sst remove --stage prod
```

</TabItem>
</MultiPackagerCode>

This removes the local and prod environments of your app.

---

## 6. Next steps

If you are ready to dive into the details of SST, [**check out our tutorial**](learn/index.md).
