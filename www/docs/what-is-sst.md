---
title: What is SST
description: "Learn about how SST apps are structured."
---

SST is an application framework that helps you build and deploy full-stack serverless applications. With SST you can create APIs, databases, frontends; connect them all together and deploy them as a single application to AWS.

SST differs from other frameworks in that it helps you with both development and deployment. So when you deploy your SST application, you get a live URL that you can share with your users right away.

Let's look at how it all works.

---

## APIs

To start with, SST makes it easy to build a backend with serverless. For example, you can use the [`Api`](constructs/Api.md) construct to create an API in a few lines.

```js
new Api(this, "API", {
  routes: {
    "GET  /notes": "functions/list.main",
    "POST /notes": "functions/create.main",
  },
});
```

Behind the scenes this creates an instance of an [Amazon API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html) with a couple of routes. Each route here points to a _Function_.

[Constructs](constructs/index.md) allow you to create the infrastructure for your app. These can be written in TypeScript or JavaScript. **We recommend TypeScript**.

---

## Functions

At the heart of SST applications are Functions, powered by [AWS Lambda](https://aws.amazon.com/lambda/). These represent your application code and they get invoked the infrastructure in your application.

From the above example, when a user hits the `/notes` route in your API, the `main` function in the `functions/list.ts` file gets executed.

```ts
"GET /notes": "functions/list.main"
```

Your function code can be in TypeScript, JavaScript, Python, Golang, Java, or C#. A simple TypeScript Lambda function looks something like:

```ts
export const main: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify([
      /** list of notes **/
    ]),
  };
};
```

Here the API route will respond with what the function returns.

---

## Databases

To power your applications SST lets you create serverless databases. Here the [`RDS`](constructs/RDS.md) construct creates a new [Amazon RDS](https://aws.amazon.com/rds/) serverless PostgreSQL cluster.

```ts
new RDS(this, "rds", {
  engine: "postgresql10.14",
  defaultDatabaseName: "main",
  migrations: "services/migrations",
});
```

SST supports writing typesafe migrations for it.

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

## Frontend

For the frontend of your application SST lets you deploy [React](constructs/ReactStaticSite.md), [Next.js](constructs/NextjsSite.md), or [Remix](constructs/RemixSite.md) apps. Or any [static website](constructs/StaticSite.md). Here for example, we are defining a [Vite](https://vitejs.dev) static site using the [`ViteStaticSite`](constructs/ViteStaticSite.md) construct.

```ts
new ViteStaticSite(this, "site", {
  path: "web",
  buildCommand: "npm run build",
  environment: {
    VITE_API_URL: api.url,
  },
});
```

We are also able to pass our API URL to the frontend as an environment variable.

```ts
environment: {
  VITE_API_URL: api.url,
},
```

So **we don't have to hardcode our backend config** in the frontend.

---

## Constructs

SST has constructs for most common use cases. For example, we can add **cron jobs** to our application.

```ts
new Cron(this, "cron", {
  schedule: "rate(1 minute)",
  job: "functions/cronjob.main",
});
```

Or **queues**.

```ts
new Queue(this, "queue", {
  consumer: "functions/consumer.main",
});
```

Behind the scenes, SST's constructs extend [AWS CDK](https://aws.amazon.com/cdk/) to compile your infrastructure into [CloudFormation](https://aws.amazon.com/cloudformation/). This means you can use [CDK constructs](https://constructs.dev) in your SST apps to **deploy any AWS service**.

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

## SST CLI

To deploy your applications to AWS, SST comes with a [CLI](packages/cli.md).

```bash
sst deploy
```

The CLI uses your local [IAM credentials](https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html) to deploy your app to AWS.

---

## Stages

You can also deploy your app to a specific _stage_.

```bash
sst deploy --stage prod
```

A stage is a string that SST uses to namespace the resources in your application. This allows SST to **deploy your app to multiple environments** in the same AWS account.

---

## Local dev

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
-->

---

## SST Console

The `sst start` CLI also powers a **web based dashboard** called the [SST Console](console.md).

![SST Console homescreen](/img/console/sst-console-homescreen.png)

The SST Console allows you to view and interact in real-time with your application logs, you can manually invoke functions, replay invocations, and do things like querying your database and running migrations.

---

## Starters

To get started, you can create a new SST application using one of our starters with the [`create-sst`](packages/create-sst.md) CLI.

```bash
npm init sst
```

By default, this will set you up with a full-stack app that has a: GraphQL API, PostgreSQL RDS database, and, a Vite React app. The starter is a monorepo organized into separate packages following [Domain Driven Design](learn/domain-driven-design.md). This is our recommended way to start with SST.

However, if you are a more advanced user, you can pick one of our minimal templates and use the constructs to build the type of app you need.
