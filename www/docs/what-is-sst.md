---
title: What is SST
description: "A high-level overview of SST in plain english."
---

SST is a framework that helps you build and deploy full-stack serverless applications. With SST you can create APIs, databases, frontends; connect them all together, and deploy them to AWS.

---

## Infrastructure

SST differs from other frameworks in that it helps you with **both** the **infrastructure** for your app and your **application code**.

You can describe the infrastructure of your app in **TypeScript** or **JavaScript** using [Constructs](constructs/index.md).

---

### APIs

For example, you can use the [`Api`](constructs/Api.md) construct to define an API in a few lines.

```js
new Api(this, "API", {
  routes: {
    "GET  /notes": "functions/list.main",
    "POST /notes": "functions/create.main",
  },
});
```

Behind the scenes this creates an instance of an [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html) with a couple of routes. Each route here points to a [_Function_](#functions). We'll look at them below.

---

### Databases

To power your applications, SST lets you create serverless databases. Here the [`RDS`](constructs/RDS.md) construct configures a new [Amazon RDS](https://aws.amazon.com/rds/) serverless PostgreSQL cluster.

```ts
new RDS(this, "rds", {
  engine: "postgresql10.14",
  defaultDatabaseName: "main",
  migrations: "services/migrations",
});
```

You can also write typesafe migrations.

```ts
export async function up(db) {
  await db.schema.createTable("comment").execute();
}

export async function down(db) {
  await db.schema.dropTable("comment").execute();
}
```

In addition to SQL databases, SST also supports NoSQL serverless databases like [Amazon DynamoDB](constructs/Table.md).

---

### Cron jobs

SST has constructs for most common backend use cases. For example, we can add cron jobs to our application.

```ts
new Cron(this, "cron", {
  schedule: "rate(1 minute)",
  job: "functions/cronjob.main",
});
```

You can also add [**Auth**](constructs/Auth.md), [**Queues**](constructs/Queue.md), [**Pub/Sub**](constructs/Topic.md), [**Data Streams**](constructs/KinesisStream.md), and more.

---

### All AWS services

Aside from the use cases that SST's constructs support, you can **deploy any AWS service** in SST. This is because you can also use any of AWS' constructs in your SST apps.

Here we are defining an [Amazon ECS](https://aws.amazon.com/ecs/) cluster with an [AWS construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs_patterns-readme.html).

```ts
import * as ecs from "aws-cdk-lib/aws-ecs";

const cluster = new ecs.Cluster(this, "Cluster", {
  vpc,
});
```

This makes it easy to extend SST to fit any use case.

---

## Functions

At the heart of SST applications are Functions — powered by [AWS Lambda](https://aws.amazon.com/lambda/). These represent your application code. They are invoked by the infrastructure in your application.

From the API example above.

```ts
"GET /notes": "functions/list.main"
```

When a user hits the `/notes` route in your API, the `main` function in the `functions/list.ts` file gets executed. The API then responds with what the function returns.

```ts
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

## Frontend

For the frontend of your application, SST lets you deploy [**React**](constructs/ReactStaticSite.md), [**Next.js**](constructs/NextjsSite.md), or [**Remix**](constructs/RemixSite.md) apps. Or any [static website](constructs/StaticSite.md).

Here for example, we are defining a [Vite](https://vitejs.dev) static site using the [`ViteStaticSite`](constructs/ViteStaticSite.md) construct.

```ts
new ViteStaticSite(this, "site", {
  path: "web",
  buildCommand: "npm run build",
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

new ViteStaticSite(this, "site", {
  // ...
  environment: {
    VITE_API_URL: api.url,
  },
});
```

With SST, we **don't need to hardcode our backend config** in the frontend.

---

## SST CLI

SST comes with a [CLI](packages/cli.md) that can deploy your applications and help you work on them locally.

---

### Local dev

The [`sst start`](live-lambda-development.md) command starts a local development environment that lets you [**set breakpoints and test your functions locally**](live-lambda-development.md#debugging-with-visual-studio-code). You don't need to mock any resources or wait for the changes to redeploy.

```bash
sst start
```

It does this by starting up a local server and proxying requests from the Lambda functions in AWS to your machine.

The `sst start` CLI also powers a **web based dashboard** called the [SST Console](console.md).

![SST Console homescreen](/img/console/sst-console-homescreen.png)

With the Console you can view and interact with your application logs in real-time. You can manually invoke functions, replay invocations, and do things like **querying your database** and **running migrations**.

---

### Deployment

To deploy your application you use the [`sst deploy`](packages/cli.md#deploy-stack) command.

```bash
npx sst deploy
```

This will convert your constructs to [CloudFormation](https://aws.amazon.com/cloudformation/), package your functions and frontend assets, upload it to AWS, and create the infrastructure for it.

The SST CLI uses your local [IAM credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) to **deploy to your AWS account**.

---

### Environments

You can also deploy your app to a specific _stage_ or environment. This lets you create **separate development and production** environments.

```bash
npx sst deploy --stage prod
```

Behind the scenes, SST uses the stage to namespace all the resources in your application.

---

## Starters

You can create a new SST application with one of our starters and the [`create-sst`](packages/create-sst.md) CLI.

```bash
npx create-sst
```

This will set you up with a full-stack TypeScript app with all the best practices. It has a GraphQL API, PostgreSQL RDS database, and a Vite React app. This is the **recommended way** to start with SST.

```bash
? What kind of project do you want to create? (Use arrow keys)
❯ graphql
  minimal
  examples
```

However, if you are a more advanced user, you can pick one of our minimal templates and use the constructs to build the type of app you need.

---

If you are ready to get started with SST, [**check out our tutorial**](learn/index.md). It uses the GraphQL starter to build a simple Reddit clone.
