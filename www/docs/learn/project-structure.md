---
id: project-structure
title: Project Structure [D]
description: "Project structure of an SST app"
---

# Project Structure
Let's take a high level look at what an SST project looks like

## Code Organization
After running the `create-sst` command your project structure will look like this

```
my-sst-app
├─ api
│  ├─ core
│  ├─ functions
│     └─ graphql
│  └─ migrations
├─ graphql
├─ stacks
└─ web
```

- `api` houses everything that powers your backend. This includes your GraphQL API but also all your business logic, other functions, and whatever else you need.

- `api/core` contains all of your business logic. `create-sst` encourages Domain Driven Design so that you keep your business logic seperate from your API and lambda functions. This allows you to write simple, reusable code that implements all the things your application can do which are then called by external facing services - like an API.

- `api/functions` is where you can place all the code for your functions. Your functions should generally be fairly simple and mostly be calling into code defined in `api/core`

- `api/functions/graphql` is a predefined function and supporting code that serves up a GraphQL API and is wired up for code-generation and to an API construct defined in `stacks`

- `api/migrations` is created by default to house your SQL Migrations. The starter includes code in `stacks` to provision an `RDS` instance but you can delete or ignore this if you're opting to use a different database like DynamoDB.

- `graphql` this folder will contain the outputs of GraphQL related code generation. Typically you won't be touching this and is contains shared code between frontend and backend tests used to query the GraphQL API.

- `stacks` contains the Infrastructure as Code defined in Typescript that is used to define all the resources your application needs. This includes things like Databases, Functions, Cron, and more. SST provides high level constructs that should cover most of what you will need but since it's all built on top of [AWS CDK](https://aws.amazon.com/cdk/) so you can always fallback to any CDK supported resource.

- `web` contains a React application provisioned with [Vite](https://vitejs.dev/) that is already wired up to be able to talk to the GraphQL API. If you are using a different frontend, for example NextJS, you can delete this folder and provision it yourself.

## Stacks

SST allows you to provision all of your infrastructure using code. Related resources are grouped together into Stacks.

A stack is simply a function which receives a context that can be used to provision some resources.

```js title="stacks/MyStack.js"
import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });
}
```

The `stacks/index.ts` file is the default entry point - you can use it to setup some global defaults and then initialize your stacks.

```js title="stacks/index.ts"
import { MyStack } from "./MyStack";
import { App } from "@serverless-stack/resources";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
    srcPath: "api",
    bundle: {
      format: "esm",
    },
  });
  app.stack(MyStack);
}
```

## Functions

The above API endpoint invokes the `handler` function in `api/functions/lambda.ts`. 

```js title="api/functions/lambda.ts"
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  };
};
```


## Project Config

Your SST app also includes a config file in `sst.json`.

```json title="sst.json"
{
  "name": "my-sst-app",
  "region": "us-east-1",
  "main": "stacks/index.ts"
}
```

Let's look at these options in detail.

- **name** This is the name of your application and used to prefix stack and resource names

- **region** Defaults for your app and can be overridden using the [`--region`](packages/cli.md#--region) CLI option.

- **main** The entry point to your SST app. Defaults to `stacks/index.ts`

Note that, you can access the **stage**, **region**, and **name** in the entry point of your app.

```js title="stacks/index.ts"
export default function(app: App) {
  app.stage; // "dev"
  app.region; // "us-east-1"
  app.name; // "my-sst-app"
}
```

You can also access them in your stacks.

```js title="stacks/MyStack.ts"
export function MyStack({ app }: StackContext) {
  app.stage; // "dev"
  app.region; // "us-east-1"
  app.name; // "my-sst-app"
}
```


