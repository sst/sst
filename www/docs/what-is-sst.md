---
title: What is SST
description: "A high-level overview of SST in plain english."
---

import styles from "./video.module.css";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

SST is a framework that makes it easy to build modern full-stack applications on AWS.

</HeadlineText>

Deploy a serverless Next.js, Remix, Astro, or Solid site to your AWS account and add any backend feature to it.

---

## Frontend

Start by defining, **_in code_**, the frontend you are using. SST supports the following.

---

### Next.js

```ts
new NextjsSite(stack, "site", {
  path: "web",
  customDomain: "my-next-app.com",
});
```

Behind the scenes, [`NextjsSite`](constructs/NextjsSite.md) will create the infrastructure to host your serverless [Next.js](https://nextjs.org/) app on AWS. Including [Lambda functions](https://aws.amazon.com/lambda/) for SSR, [edge functions](https://aws.amazon.com/lambda/edge/) for Middleware, a [CDN](https://aws.amazon.com/cloudfront/), and an [S3 bucket](https://aws.amazon.com/s3/) for static assets.

---

### Remix

Similarly there's [`RemixSite`](constructs/RemixSite.md) for [Remix](https://remix.run).

```ts
new RemixSite(stack, "site", {
  path: "web",
  customDomain: "my-remix-app.com",
});
```

---

### Astro

Or the [`AstroSite`](constructs/AstroSite.md) for [Astro](https://astro.build).

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
new SolidStartSite(stack, "site", {
  path: "web",
  customDomain: "my-solid-app.com",
});
```

---

### Static sites

There's also the [`StaticSite`](constructs/StaticSite.md) for any static site builder.

```ts
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

Let's look at it in detail.

---

#### Constructs

These snippets are called [**Constructs**](constructs/index.md). They are **TypeScript** or **JavaScript** classes, where each class corresponds to a feature that can be configured it through its props.

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
  config(input) {
    return {
      name: "my-sst-app",
      region: "us-east-1",
    }
  },
  stacks(app) {
    app.stack(Database).stack(Api).stack(Web);
  },
} satisfies SSTConfig;
```

Here we are also specifying a name for our app and the AWS region it'll be deployed to.

Now let's look at how you can add the backend for your app with these constructs.

---

## Backend

SST has constructs for most backend features. And you can even use any AWS service in your app.

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

Behind the scenes, this creates a serverless API using [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html), where each route points to a Lambda function.

---

### Functions

So when a user hits the `/notes` route in your API.

```ts
"GET /notes": "services/list.main"
```

The `main` function in `services/list.ts` gets executed. The API then responds with what's returned.

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

You can add cron jobs to your application with a few lines. Here's a cron job that calls a function every minute.

```ts
new Cron(stack, "cron", {
  schedule: "rate(1 minute)",
  job: "services/cronjob.main",
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

---

#### In the frontend

For example, you can grab the endpoint of your API and pass it to Next.js as an environment variable.

```ts {1,6}
const api = new Api(/* ... */);

new NextjsSite(stack, "site", {
  // ...
  environment: {
    API_URL: api.url,
  },
});
```

You can then connect to your API in Next.js without hardcoding the URL.

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

Now the functions in your API will have **type safe access** to your database.

```ts {6-8} title="services/list.ts"
import { RDS } from "sst/node/rds";

export async function main() {
  new ExecuteStatementCommand({
    sql: "select * from notes",
    secretArn: RDS.notesDb.secretArn,
    resourceArn: RDS.notesDb.clusterArn,
    database: RDS.notesDb.defaultDatabaseName,
  });
}
```

Behind the scenes SST also adds the required [**permissions**](https://aws.amazon.com/iam/), so only your API has access to the database.

---

## Project structure

We've looked at a couple of different types of files. Let's take a step back and see what an SST app looks like in practice.

SST applications are monorepo by default.

```
my-sst-app
├─ sst.config.ts
├─ package.json
├─ services
├─ stacks
└─ web
```

Where the `web/` directory is your frontend, `services/` is the backend, and `stacks/` has your infrastructure definitions.
For the frontend of your application, SST lets you deploy [**Next.js**](constructs/NextjsSite.md) and [**Remix**](constructs/RemixSite.md) apps. Or any [static website](constructs/StaticSite.md).

Here for example, we are defining a [Vite](https://vitejs.dev) static site using the [`StaticSite`](constructs/StaticSite.md) construct.

```ts
new StaticSite(this, "site", {
  path: "web",
  buildCommand: "npm run build",
  buildOutput: "dist",
  customDomain: "my-sst-app.com",
  environment: {
    VITE_API_URL: api.url,
  },
});
```

Behind the scenes, this creates a static website powered by [Amazon S3](https://aws.amazon.com/s3/) and serves it through [Amazon CloudFront](https://aws.amazon.com/cloudfront/), a CDN.

---

### Connect to the API

SST makes it easy to connect your frontend to your API by letting you share config between constructs.

For example, you can grab the API endpoint from the API construct and pass it to our frontend as an environment variable.

```ts {1,6}
const api = new Api(/* ... */);

new StaticSite(this, "site", {
  // ...
  environment: {
    VITE_API_URL: api.url,
  },
});
```

With SST, we **don't need to hardcode our backend config** in the frontend.

---

## SST CLI

To help with building and deploying your app, SST comes with a [CLI](packages/sst.md).

---

### Local dev

The [`sst dev`](live-lambda-development.md) command starts a local development environment called [Live Lambda](live-lambda-development.md), that connects directly to AWS. Letting you [set breakpoints and test your functions locally](live-lambda-development.md#debugging-with-vs-code).

```bash
npx sst dev
```

Now you can start your frontend with the [`sst env`](packages/sst.md#sst-env) command. It'll connect your frontend to the backend by loading all the environment variables.

```bash
cd web
sst env "next dev"
```

With this you can **make changes to your backend on AWS**, and see them **directly in your frontend**!

---

### SST Console

The `sst dev` CLI also powers a **web based dashboard** called the [SST Console](console.md).

![SST Console homescreen](/img/console/sst-console-homescreen.png)

With the Console you can view and interact with your application in real-time. You can manually invoke functions, view logs, replay invocations, and do things like query your database and run migrations.

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

## Starters

To create your first SST app you can use one of our starters with the [`create-sst`](packages/create-sst.md) CLI.

```bash
npm create sst@latest
```

This will set you up with a full-stack TypeScript app with a React frontend, GraphQL API, and a PostgreSQL database.

However, if you are a more advanced user, you can pick one of our minimal templates and use our constructs to build the type of app you need.

---

To get started with SST, [**check out our tutorial**](learn/index.md).
