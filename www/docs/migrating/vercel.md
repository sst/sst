---
title: Migrating From Vercel
sidebar_label: Vercel
description: "Migrate your Next.js app from Vercel to SST with OpenNext."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

A guide to migrating your Next.js app from Vercel to SST.

</HeadlineText>

---

## Why use SST instead of Vercel

There are a couple of reasons why you might want to migrate your Next.js app from [Vercel](https://vercel.com) to SST. Since SST uses [OpenNext](https://open-next.js.org) to deploy to your AWS account:

- It seamlessly integrates with your other AWS resources. This means that you can easily add other features to your Next.js app; like queues, databases, file uploads, or cron jobs.
- You also get more control over your infrastructure and the ability to customize it.
- Your data will never leave your AWS account.
- Finally, AWS is also a far cheaper option than Vercel. This is especially true for high traffic sites.

---

## Add SST to your Next.js app

Let's assume your Next.js app looks something like this:

```txt
my-nextjs-app/
├── pages/
│   ├── index.ts
│   └── about.ts
├── next.config.js
└── package.json
```

Simply run the following in your package root.

```bash
npx create-sst@latest
```

This will detect that it's running in a Next.js app and will add a `sst.config.ts` to the root.

```txt {5}
my-nextjs-app/
├── pages/
│   ├── index.ts
│   └── about.ts
├── sst.config.ts
├── next.config.js
└── package.json
```

The `sst.config.ts`, initializes this as an SST app and adds Next.js to it.

```ts title="sst.config.ts"
const site = new NextjsSite(stack, "site");
```

It'll also add the following packages to your `package.json` — `sst`, `aws-cdk-lib`, and `constructs`. And changes your Next.js `dev` script.

```diff title="package.json"
- "dev": "next dev",
+ "dev": "sst bind next dev",
```

This allows your Next.js app to connect to AWS when it runs locally.

---

#### Start the local environment

Now to start your local environment, start SST.

```bash
npx sst dev
```

Then start Next.js in another terminal.

```bash
npm run dev
```

---

## Deploy your Next.js app to AWS

With SST initialized in your Next.js app, you can deploy it to prod by running:

```bash
npx sst deploy --stage prod
```

This will deploy your app to your AWS account using your [local AWS credentials](../advanced/iam-credentials.md#loading-from-a-file). Once deployed, you'll get an auto-generated URL that looks like — `https://d3j4c16hczgtjw.cloudfront.net`.

At this point your app is deployed using both Vercel and SST. You can check and make sure that it's working properly before moving ahead.

---

## Migrate your custom domain

Next you might want to migrate your custom domain. If you have it on Vercel, you'll first need to [transfer it out of Vercel](https://vercel.com/guides/how-do-i-transfer-my-domain-out-of-vercel). Then you can [migrate it to Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-transfer-to-route-53.html).

And add it to your `sst.config.ts`.

```ts title="sst.config.ts" {2}
const site = new NextjsSite(stack, "site", {
  customDomain: "my-nextjs-app.com",
});
```

---

## Configure preview environments

The SST CLI supports deploying to multiple stages (or environments). Simply pass in a stage name when you deploy your app.

```bash
# Deploy to staging
npx sst deploy --stage staging
# Deploy to prod
npx sst deploy --stage prod
# Deploy a PR stage
npx sst deploy --stage pr123
```

You can configure this with GitHub Actions. Alternatively, you can use [**_SEED_**](https://seed.run) — a service built by the SST team. You can connect your Git repo and it'll deploy your SST app when you `git push`. It also supports preview environments out of the box.

---

Now that you've migrated your Next.js app to SST, you might want to add other backend features to it, or connect it to your other AWS resources. [Head over here to get started](../start/nextjs.md).
