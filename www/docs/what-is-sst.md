---
title: What is SST
description: "SST is a framework that makes it easy to build modern full-stack applications on AWS."
---

import styles from "./video.module.css";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST is a framework that makes it easy to build modern full-stack applications on AWS.

</HeadlineText>

Deploy a serverless Next.js, Svelte, Remix, Astro, or Solid app to your AWS account and add any backend feature to it.

---

## Frontend

Start by defining, **_in code_**, the frontend you are using. SST supports the following.

---

### Next.js

```ts
new NextjsSite(stack, "site", {
  customDomain: "my-next-app.com",
});
```

Behind the scenes, [`NextjsSite`](constructs/NextjsSite.md) will create the infrastructure to host your serverless [Next.js](https://nextjs.org/) app on AWS. You can also configure it with your custom domain.

---

### Svelte

Similarly there's [`SvelteKitSite`](constructs/SvelteKitSite.md) for [Svelte](https://svelte.dev).

```ts
new SvelteKitSite(stack, "site", {
  customDomain: "my-svelte-app.com",
});
```

---

### Remix

Or the [`RemixSite`](constructs/RemixSite.md) for [Remix](https://remix.run).

```ts
new RemixSite(stack, "site", {
  customDomain: "my-remix-app.com",
});
```

---

### Astro

Or the [`AstroSite`](constructs/AstroSite.md) for [Astro](https://astro.build).

```ts
new AstroSite(stack, "site", {
  customDomain: "my-astro-app.com",
});
```

---

### Solid

And the [`SolidStartSite`](constructs/SolidStartSite.md) for [Solid](https://www.solidjs.com).

```ts
new SolidStartSite(stack, "site", {
  customDomain: "my-solid-app.com",
});
```

---

### Static sites

There's also the [`StaticSite`](constructs/StaticSite.md) for any static site builder.

```ts {3,4}
new StaticSite(stack, "site", {
  path: "web",
  buildOutput: "dist",
  buildCommand: "npm run build",
  customDomain: "my-static-site.com",
});
```

Just specify the build command and point to where the output is generated.

---

## Infrastructure

The above snippets are a way of defining the features of your application in code. You can define any feature of your application, not just the frontend.

You can add backend features like APIs, databases, cron jobs, and more. All **without ever using the AWS Console**.

---

#### Constructs

These snippets are called [**Constructs**](constructs/index.md). They are **TypeScript** or **JavaScript** classes, where each class corresponds to a feature and it can be configured through its props.

```ts
const site = new NextjsSite(stack, "site", {
  /** props **/
});
```

We recommend using TypeScript because it allows for **full type safety** while configuring your application.

---

#### Stacks

Constructs are grouped into stacks. They allow you to organize the infrastructure in your application.

```ts title="stacks/Web.ts"
export function Web({ stack }: StackContext) {
  const site = new NextjsSite(stack, "site");
}
```

Each stack is just a function that creates a set of constructs.

---

#### App

Finally, you add all your stacks to your app in the `sst.config.ts`.

```ts title="sst.config.ts" {9}
export default {
  config() {
    return {
      name: "my-sst-app",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(Database).stack(Api).stack(Web);
  },
} satisfies SSTConfig;
```

Now let's look at how you can add the backend for your app with these constructs.

---

## Backend

SST has constructs for most backend features. And you can even use any AWS service in your app.

---

### APIs

For example, with the [`Api`](constructs/Api.md) construct you can define an API in a few lines.

```js
new Api(stack, "api", {
  routes: {
    "GET  /notes": "functions/list.main",
    "POST /notes": "functions/create.main",
  },
});
```

Behind the scenes, this creates a serverless API using [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html), where each route points to a Lambda function.

---

### Functions

So when a user hits the `/notes` route in your API.

```ts
"GET /notes": "functions/list.main"
```

The `main` function in `functions/list.ts` gets executed. The API then responds with what's returned.

```ts title="functions/list.ts"
export async function main() {
  return {
    statusCode: 200,
    body: JSON.stringify([
      /** list of notes **/
    ]),
  };
}
```

Your functions can be in **TypeScript**, **JavaScript**, **Python**, **Golang**, **Java**, or **C#**.

---

### Databases

You can add a serverless database to your app. For example, the [`RDS`](constructs/RDS.md) construct configures a new [Amazon RDS](https://aws.amazon.com/rds/) serverless PostgreSQL cluster.

```ts
new RDS(stack, "notesDb", {
  engine: "postgresql11.13",
  defaultDatabaseName: "main",
  migrations: "services/migrations",
});
```

In addition to SQL databases, SST also supports [Amazon DynamoDB](constructs/Table.md), a NoSQL serverless database.

---

### File uploads

Or create S3 buckets to support file uploads in your application.

```ts
new Bucket(stack, "public");
```

---

### Cron jobs

And add cron jobs to your application with a few lines. Here's a cron job that calls a function every minute.

```ts
new Cron(stack, "cron", {
  schedule: "rate(1 minute)",
  job: "functions/cronjob.main",
});
```

SST also has constructs for [**Auth**](constructs/Auth.md), [**Queues**](constructs/Queue.md), [**Pub/Sub**](constructs/Topic.md), [**Data Streams**](constructs/KinesisStream.md), and more.

---

### All AWS services

Aside from the features that SST's constructs support, you can **add any AWS service** to your app. This is because SST is built on top of [AWS CDK](https://aws.amazon.com/cdk/) and you can use any CDK construct in SST.

Here we are defining an [Amazon ECS](https://aws.amazon.com/ecs/) cluster with an [AWS CDK construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns-readme.html).

```ts
import * as ecs from "aws-cdk-lib/aws-ecs";

const cluster = new ecs.Cluster(stack, "Cluster", {
  vpc,
});
```

This ensures that as your app grows, you'll be able to add any feature you need.

---

## Connecting everything

Once you've added a couple of features, SST can help you connect them together. This is great because you **won't need to hardcode** anything in your app.

For example, you can [_bind_](resource-binding.md) an S3 bucket to your Next.js app.

```ts {1,5}
const bucket = new Bucket(stack, "public");

new NextjsSite(stack, "site", {
  // ...
  bind: [bucket],
});
```

You can then connect to the S3 bucket in Next.js without hardcoding the bucket name.

```ts title="pages/index.tsx" {4}
import { Bucket } from "sst/node/bucket";

export async function getServerSideProps() {
  const name = Bucket.public.bucketName;
}
```

Behind the scenes SST also adds the required [**permissions**](https://aws.amazon.com/iam/), so only your Next.js app has access to the bucket.

---

## Project structure

We've looked at a couple of different types of files. Let's take a step back and see what an SST app looks like in practice.

---

#### Standalone mode

Running [`npm create sst`](packages/create-sst.md) generates a _standalone_ SST app. It's monorepo by default.

```
my-sst-app
├─ sst.config.ts
├─ package.json
├─ packages
│  ├─ functions
│  ├─ core
│  └─ web
└─ stacks
```

Where you can add your frontend to the `packages/web/` directory, `packages/functions/` are for backend functions, `packages/core/` is for any shared business logic. Finally, `stacks/` has your infrastructure definitions.

---

#### Drop-in mode

SST can also be used as a part of your frontend app. For example, if you run `npm create sst` inside a Next.js app, it'll drop a `sst.config.ts` in your project.

```text {3}
my-nextjs-app
├─ next.config.js
├─ sst.config.ts
├─ package.json
├─ public
├─ styles
└─ pages
```

This is great if you have a simple Next.js app and you just want to deploy it to AWS with SST.

---

## SST CLI

To help with building and deploying your app, SST comes with a [CLI](packages/sst.md).

---

### Local dev

The [`sst dev`](live-lambda-development.md) command starts a local development environment called [Live Lambda](live-lambda-development.md), that connects directly to AWS. Letting you [set breakpoints and test your functions locally](live-lambda-development.md#debugging-with-vs-code).

```bash
npx sst dev
```

Now you can start your frontend with the [`sst bind`](packages/sst.md#sst-bind) command and it'll connect your frontend to the backend.

```bash
sst bind next dev
```

With this you can **make changes to your backend on AWS**, and see them **directly in your frontend**!

---

### Deployment

To deploy your application to AWS, you use the [`sst deploy`](packages/sst.md#sst-deploy) command. It uses your local [IAM credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) and **deploys to your AWS account**.

```bash
npx sst deploy
```

Since everything in your app is connected, this single command is all you need. Once complete, it'll print out your app's URL!

```bash {3}
Outputs:
  ApiEndpoint: https://ck198mfop1.execute-api.us-east-1.amazonaws.com
  SiteUrl: https://my-next-app.com
```

Behind the scenes, it compiles the constructs to [AWS CloudFormation](https://aws.amazon.com/cloudformation/), packages your frontend assets and functions, uploads it to AWS, and creates your app's infrastructure.

---

### Environments

The `sst deploy` command can also deploy your app to a specific _stage_ or environment. This lets you **create separate environments** for development, production, pull-requests, or branches.

```bash
# Deploy to dev
npx sst deploy --stage dev

# Deploy to production
npx sst deploy --stage prod
```

You can use this in your GitHub Actions workflow to generate pull-request based environments.

Or, you can get **automatic preview environments** with [**_SEED_**](https://seed.run), a service built by the SST team.

---

## SST Console

The [SST Console](console.md) is a web based dashboard for managing your SST apps with your team. 

![SST Console homescreen](/img/console/sst-console-logs.png)

With the Console you can view and interact with your application in real-time. You can manually invoke functions, view logs, replay invocations, and more with your team.

---

## Next steps

1. Create your first SST app
   - [Create a standalone SST app](start/standalone.md)
   - [Use SST with your Next.js app](start/nextjs.md)
   - [Use SST with your Astro site](start/astro.md)
2. Ready to dive into the details of SST? [**Check out our tutorial**](learn/index.md).
