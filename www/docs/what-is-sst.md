---
title: What is SST
description: "SST is an application framework that helps you build and deploy full-stack serverless applications."
---

SST is an application framework that helps you build and deploy full-stack serverless applications. With SST you can create APIs, databases, frontends; connect them all together and deploy to AWS.

---

## Infrastructure

SST differs from other frameworks in that it helps you with **both** the **infrastructure** for your app and your **application code**.

You can describe the infrastructure of your app in **TypeScript** or **JavaScript** using [Constructs](constructs/index.md).

---

### APIs

For example, you can use the [`Api`](constructs/Api.md) construct to create an API in a few lines.

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

To power your applications, SST lets you create serverless databases. Here the [`RDS`](constructs/RDS.md) construct creates a new [Amazon RDS](https://aws.amazon.com/rds/) serverless PostgreSQL cluster.

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

<!--

---

### Queues

Or **queues**.

```ts
new Queue(this, "queue", {
  consumer: "functions/consumer.main",
});
```
-->

---

### All AWS services

Behind the scenes, SST's constructs extend [AWS CDK](https://aws.amazon.com/cdk/) to compile your infrastructure into [CloudFormation](https://aws.amazon.com/cloudformation/). So you can use [CDK constructs](https://constructs.dev) in your SST apps.

```ts
import * as ecs from "aws-cdk-lib/aws-ecs";

const cluster = new ecs.Cluster(this, "Cluster", {
  vpc,
});
```

This means that with SST you can **deploy any AWS service**.

<!--

#### All AWS services

Behind the scenes, SST's constructs extend [AWS CDK](https://aws.amazon.com/cdk/) to compile your infrastructure into a [CloudFormation template](https://aws.amazon.com/cloudformation/resources/templates/). This means that you to use CDK constructs in your SST apps.

For example, you can use a [CDK construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html) to create an [Amazon ECS Cluster](https://aws.amazon.com/ecs/).

```ts
const cluster = new ecs.Cluster(this, "Cluster", {
  vpc,
});

cluster.addCapacity("DefaultAutoScalingGroupCapacity", {
  instanceType: new ec2.InstanceType("t2.xlarge"),
  desiredCapacity: 3,
});
```

As a result, you can use any AWS service in your SST app.
-->

---

## Functions

At the heart of SST applications are Functions; powered by [AWS Lambda](https://aws.amazon.com/lambda/). These represent your application code. They are invoked by the infrastructure in your application.

From the API example above.

```ts
"GET /notes": "functions/list.main"
```

When a user hits the `/notes` route in your API, the `main` function in the `functions/list.ts` file gets executed. And it'll respond with what the function returns.

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

For the frontend of your application SST, lets you deploy [**React**](constructs/ReactStaticSite.md), [**Next.js**](constructs/NextjsSite.md), or [**Remix**](constructs/RemixSite.md) apps. Or any [static website](constructs/StaticSite.md). Here for example, we are defining a [Vite](https://vitejs.dev) static site using the [`ViteStaticSite`](constructs/ViteStaticSite.md) construct.

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

### Sharing config

We are also able to pass our API URL to the frontend as an environment variable.

```ts
environment: {
  VITE_API_URL: api.url,
},
```

So **we don't have to hardcode our backend config** in the frontend.

---

<!--

## Stacks

Stacks are a way to organize your constructs in SST.

```ts
export function ApiStack({ stack }: StackContext) {
  const api = new Api(stack, "API", {
    routes: {
      "GET  /notes": "functions/list.main",
      "POST /notes": "functions/create.main",
    },
  });

  return { api };
});
```

It makes sense to split your constructs into stacks because CloudFormation has a limit on the total number of resources per stack. Also, it makes your applications faster to deploy, as SST deploys your stacks concurrently.

---

## Apps

Finally, an SST app is made up of one or more stacks.

```js
export default function main(app) {
  app.stack(DatabaseStack).stack(ApiStack).stack(WebStack);
}
```

When put together, SST applications are **monorepos** that contain your infrastructure definitions along with your backend and frontend code.

---

-->

## SST CLI

Aside from the constructs, SST comes with a [CLI](packages/cli.md) to deploy and manage your applications.

---

### Deployment

By running the following command, the SST CLI will convert your constructs to CloudFormation, package your functions and frontend assets, upload it to AWS, and create the infrastructure for it.

```bash
sst deploy
```

The CLI uses your local [IAM credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) to **deploy to your AWS account**.

---

### Environments

You can also deploy your app to a specific _stage_ or environment.

```bash
sst deploy --stage prod
```

A stage is a string that SST uses to namespace the resources in your application. This allows SST to **deploy your app to multiple environments** in the same AWS account.

---

### Local development

The ability to deploy to environments also allows SST to support a completely separate local development environment.

```bash
sst start
```

The [`sst start`](live-lambda-development.md) command starts a local server and proxies requests from the Lambda functions to your machine. This allows you to [**set breakpoints and test your functions locally**](live-lambda-development.md#debugging-with-visual-studio-code).

<!--

```
Please enter a stage name you’d like to use locally.
Or hit enter to use the one based on your AWS credentials (Bob):
```

The `sst start` command also uses a stage based on the username from your AWS credentials. This allows your teammates to work on the same application at the same time.

---
-->

<!--
### SST Console
-->

The `sst start` CLI also powers a **web based dashboard** called the [SST Console](console.md).

![SST Console homescreen](/img/console/sst-console-homescreen.png)

With the Console you can view and interact with your application logs in real-time. You can manually invoke functions, replay invocations, and do things like **querying your database** and **running migrations**.

---

## Starters

To get started, you can create a new SST application using one of our starters with the [`create-sst`](packages/create-sst.md) CLI.

```bash
npm init sst
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
