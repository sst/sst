---
id: project-structure
title: Project Structure [D]
description: "Project structure of an SST app"
---

# TODO: need to update the project structure to include graphql and web.

Your app starts out with the following structure.

```
my-sst-app
├── README.md
├── node_modules
├── .gitignore
├── package.json
├── sst.json
├── stacks
|   ├── MyStack.ts
|   └── index.ts
└── backend
    └── functions
        └── lambda.ts
```

An SST app is made up of a couple of parts.

- `stacks/` — App Infrastructure

  The code that describes the infrastructure of your serverless app is placed in the `stacks/` directory of your project. SST uses [AWS CDK](https://aws.amazon.com/cdk/), to create the infrastructure.

- `backend/` — App Code

  The code that’s run when your app is invoked is placed in the `backend/` directory of your project. These are your Lambda functions.

You can change this structure around to fit your workflow. This is just a good way to get started.

## Project config

Your SST app also includes a config file in `sst.json`.

```json title="sst.json"
{
  "name": "my-sst-app",
  "region": "us-east-1",
  "main": "stacks/index.ts"
}
```

Let's look at these options in detail.

- **name**

  Used while prefixing your stack and resource names.

- **region**

  Defaults for your app and can be overridden using the [`--region`](packages/cli.md#--region) CLI option.

- **main**

  The entry point to your SST app. Defaults to `stacks/index.ts` or `stacks/index.js` for TypeScript and JavaScript respectively.

Note that, you can access the **stage**, **region**, and **name** in the entry point of your app.

```ts title="stacks/index.ts"
app.stage; // "dev"
app.region; // "us-east-1"
app.name; // "my-sst-app"
```

You can also access them in your stacks.

```ts title="stacks/MyStack.ts"
export function MyStack({ app }: StackContext) {
  app.stage; // "dev"
  app.region; // "us-east-1"
  app.name; // "my-sst-app"
}
```

## Infrastructure

The `stacks/index.ts` file is the entry point for defining the infrastructure of your app. It has a default export function to add your stacks.

```tsx title="stacks/index.ts"
import { MyStack } from "./MyStack";
import { App } from "@serverless-stack/resources";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs14.x",
    srcPath: "backend",
    bundle: {
      format: "esm",
    },
  });
  app.stack(MyStack);
}
```

You'll notice that we are using `import` and `export`. This is because SST automatically transpiles your ES (and TypeScript) code using [esbuild](https://esbuild.github.io/).

In the sample `stacks/MyStack.js` you can add the resources to your stack.

```tsx title="stacks/MyStack.js"
import { StackContext, Api } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });
}
```

In the sample app we are using [a higher-level API construct](constructs/Api.md) to define a simple API endpoint.

```ts
const api = new sst.Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.handler",
  },
});
```

## Functions

The above API endpoint invokes the `handler` function in `src/lambda.js`.

```ts title="backend/functions/lambda.ts"
import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  };
};
```

Notice that we are using `export` here as well. SST also transpiles your function code.
