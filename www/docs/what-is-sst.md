---
title: What is SST
description: "A high-level overview of SST in plain english."
---

import styles from "./video.module.css";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST is a framework that makes it easy to build modern full-stack applications on AWS.

</HeadlineText>

<div class={styles.videoWrapper}>
  <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/YFFMb8JfICM" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

With SST you can deploy a serverless Next.js, Remix, Astro, or Solid site to AWS. And add any backend feature to it.

---

## Infrastructure

You start by defining the features of your application, _**in code**_. Like the frontend you are using. Or any backend feature, like an API, or database.

---

#### Constructs

You do this using something called [**Constructs**](constructs/index.md). A construct is a **TypeScript** or **JavaScript** class, where each class corresponds to a feature and can be configured using its props.

```ts
const site = new NextjsSite(stack, "site", {
  path: "web",
  customDomain: "my-next-app.com",
});
```

We'll look at these in detail below.

---

#### Stacks

Constructs are grouped into stacks. Stacks allow you to organize your infrastructure.

```ts title="stacks/Web.ts"
export function Web({ stack }: StackContext) {
  const site = new NextjsSite(stack, "site", {
    /** props **/
  });
}
```

Each stack is just a function that creates a set of constructs.

---

#### App

Finally, you add all your stacks to your app.

```ts title="stacks/index.ts"
export default function main(app: App) {
  app.stack(Database).stack(Api).stack(Web);
}
```

SST internally calls this `main` function to create the infrastructure for your app.

Now let's look at how to build your app with these constructs.

---

## Frontend

To start with, you might be using Next.js, Remix, Astro, Solid, or just a plain static site for your frontend. You can define this in code using one of our frontend constructs.

---

### Next.js

For example, we can define a Next.js site using the [`NextjsSite`](constructs/NextjsSite.md) construct.

```ts
new NextjsSite(stack, "site", {
  path: "web",
  customDomain: "my-next-app.com",
});
```

Behind the scenes, SST will create the infrastructure to host your serverless Next.js app on AWS. Including [Lambda functions](https://aws.amazon.com/lambda/) for SSR, [edge functions](https://aws.amazon.com/lambda/edge/) for the Middleware, a [CDN](https://aws.amazon.com/cloudfront/), and an [S3 bucket](https://aws.amazon.com/s3/) for static assets.

---

### Remix

Similarly there's the [`RemixSite`](constructs/RemixSite.md) construct for [Remix](https://remix.run).

```ts
new RemixSite(stack, "site", {
  path: "web",
  customDomain: "my-remix-app.com",
});
```

---

### Astro

Or the [`AstroSite`](constructs/AstroSite.md) construct for [Astro](https://astro.build).

```ts
new AstroSite(stack, "site", {
  path: "web",
  customDomain: "my-astro-app.com",
});
```

---

### Solid

And the [`SolidStartSite`](constructs/SolidStartSite.md) for [Solid](https://www.solidjs.com).

```ts
new SolidSite(stack, "site", {
  path: "web",
  customDomain: "my-solid-app.com",
});
```

---

### Static sites

There's also a [`StaticSite`](constructs/StaticSite.md) construct that supports any static site builder. Just specify how to build it and where the build output is generated.

```ts
new StaticSite(stack, "site", {
  path: "web",
  buildOutput: "dist",
  buildCommand: "npm run build",
  customDomain: "my-static-site.com",
});
```

---

## Backend

Next, you'd want to add some backend features to your app. SST has constructs for most backend features. And you can even use any AWS service in your app.

---

### APIs

For example, with the [`Api`](constructs/Api.md) construct you can define an API in a few lines.

```js
new Api(stack, "API", {
  routes: {
    "GET  /notes": "services/list.main",
    "POST /notes": "services/create.main",
  },
});
```

Behind the scenes this creates a serverless API using [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html), where each route points to a function powered by [AWS Lambda](https://aws.amazon.com/lambda/).

---

### Functions

So when a user hits the `/notes` route in your API.

```ts
"GET /notes": "services/list.main"
```

The `main` function in the `services/list.ts` file gets executed. The API then responds with what's returned.

```ts title="services/list.ts"
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

You can add a serverless database to your app. Here the [`RDS`](constructs/RDS.md) construct configures a new [Amazon RDS](https://aws.amazon.com/rds/) serverless PostgreSQL cluster.

```ts
new RDS(stack, "notesDb", {
  engine: "postgresql11.13",
  defaultDatabaseName: "main",
  migrations: "services/migrations",
});
```

In addition to SQL databases, SST also supports [Amazon DynamoDB](constructs/Table.md), a NoSQL serverless database.

---

### Cron jobs

You can also add cron jobs to your application with a few lines. Here a function gets executed every minute.

```ts
new Cron(stack, "cron", {
  schedule: "rate(1 minute)",
  job: "services/cronjob.main",
});
```

You can also add [**Auth**](constructs/Auth.md), [**Queues**](constructs/Queue.md), [**Pub/Sub**](constructs/Topic.md), [**Data Streams**](constructs/KinesisStream.md), and more.

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

Once you've added all the features you need, SST can help you connect them all together. This ensures that you won't have to harcode anything in your app.

---

#### In the frontend

For example, you can grab the endpoint of your API, from the API construct and pass it to Next.js as an environment variable.

```ts {1,6}
const api = new Api(/* ... */);

new NextjsSite(stack, "site", {
  // ...
  environment: {
    API_URL: api.url,
  },
});
```

Now in your Next.js app you can connect to your API without harcoding the URL.

```ts {2} title="web/pages/index.tsx"
export async function getStaticProps() {
  const notes = await fetch(process.env.API_URL);
  // ...
}
```

---

#### In the backend

Similarly, you can allow your backend functions to securely connect to your infrastructure, through a concept we call [Resource Binding](resource-binding.md). For example, you can _bind_ the PostgreSQL database to the API.

```ts {4}
const rds = new RDS(stack, "notesDb" /* ... */);
const api = new Api(/* ... */);

api.bind([rds]);
```

Now the functions in your API will be able to access your database.

```ts {6-8} title="services/list.ts"
import { RDS } from "@serverless-stack/node/rds";

export async function main() {
  new ExecuteStatementCommand({
    sql: "select * from notes",
    secretArn: RDS.notesDb.secretArn,
    resourceArn: RDS.notesDb.clusterArn,
    database: RDS.notesDb.defaultDatabaseName,
  });
}
```

Behind the scenes SST adds the required [permissions](https://aws.amazon.com/iam/), so only your API has access to the database.

---

## SST CLI

SST comes with a [CLI](packages/cli.md) that can deploy your applications and help you work on them locally.

---

### Local dev

The [`sst dev`](live-lambda-development.md) command starts a local development environment that connects directly to AWS. This lets you [**set breakpoints and test your functions locally**](live-lambda-development.md#debugging-with-vs-code).

```bash
npx sst dev
```

The `sst dev` CLI also powers a **web based dashboard** called the [SST Console](console.md).

![SST Console homescreen](/img/console/sst-console-homescreen.png)

With the Console you can view and interact with your application in real-time. You can manually invoke functions, view logs, replay invocations, and do things like **querying your database** and **running migrations**.

---

### Deployment

To deploy your application to AWS, you use the [`sst deploy`](packages/cli.md#deploy-stack) command. It uses your local [IAM credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) and **deploys to your AWS account**.

```bash
npx sst deploy
```

Since everything in your app is connected, this single command is all you need to get your entire app up and running.

Behind the scenes, it compiles your constructs to [CloudFormation](https://aws.amazon.com/cloudformation/), packages your frontend assets and functions, upload it to AWS, and creates your app's infrastructure.

---

### Environments

The `sst deploy` command can also deploy your app to a specific _stage_ or environment. This lets you create separate environments for development, production, for pull-requests, or branches.

```bash
npx sst deploy --stage prod
```

You can use this in your GitHub Actions workflow. Alternatively you can get automatic preview environments with [**_SEED_**](https://seed.run), a service built by the SST team.

---

## Project structure

SST applications are monorepo by default. A standard SST app will look something like this.

```
my-sst-app
├─ sst.config.mjs
├─ services
├─ stacks
└─ web
```

Where the `web/` directory is your frontend, `services/` directory is the backend, and `stacks/` directory has your infrastructure definitions.

---

## Starters

To create your first SST app you can use one of our starters with the [`create-sst`](packages/create-sst.md) CLI.

```bash
npm create sst@latest
```

This will set you up with a full-stack TypeScript app with all the best practices.

However, if you are a more advanced user, you can pick one of our minimal templates and use our constructs to build the type of app you need.

---

If you are ready to get started with SST, [**check out our tutorial**](learn/index.md).
