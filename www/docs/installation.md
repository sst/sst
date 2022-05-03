---
id: installation
title: Installation
description: "Creating a new Serverless Stack (SST) app"
---

import config from "../config";
import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

SST is a collection of <a href={ `${ config.github }/tree/master/packages` }>npm packages</a> that allow you to create a serverless app. You can define your apps with a combination of Infrastructure as Code (using [CDK](https://aws.amazon.com/cdk/)) and Lambda functions.

To use SST you'll need:

- [Node.js](https://nodejs.org/en/download/) >= 10.15.1
- An [AWS account](https://serverless-stack.com/chapters/create-an-aws-account.html) with the [AWS CLI configured locally](https://serverless-stack.com/chapters/configure-the-aws-cli.html)

## Getting started

Create a new project using.

```bash
# With npm 6+
npm init sst
# Or with Yarn 0.25+
yarn create sst
```

## Language support

SST supports JavaScript, TypeScript, Python, Golang, C#, and F#.

| Language   |      CDK      | Lambda |
| ---------- | :-----------: | :----: |
| JavaScript |       ✓       |   ✓    |
| TypeScript |       ✓       |   ✓    |
| Go         | _Coming soon_ |   ✓    |
| Python     | _Coming soon_ |   ✓    |
| C#         | _Coming soon_ |   ✓    |
| F#         | _Coming soon_ |   ✓    |

## Project layout

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

### Infrastructure

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

### Functions

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
export function MyStack({ stack }: StackContext) {
  scope.stage; // "dev"
  scope.region; // "us-east-1"
  scope.name; // "my-sst-app"
}
```

## Building your app

Once you are ready to build your app and convert your CDK code to CloudFormation, run the following from your project root.

```bash
# With npm
npm run build
# Or with Yarn
yarn sst build
```

This will compile your ES (or TS) code to the `.build/` directory in your app. And the synthesized CloudFormation templates are outputted to `.build/cdk.out/`. Note that, you shouldn't commit the `.build/` directory to source control and it's ignored by default in your project's `.gitignore`.

## Deploying an app

Once your app has been built and tested successfully, you are ready to deploy it to AWS.

```bash
# With npm
npm run deploy
# Or with Yarn
yarn deploy
```

This command uses your **default AWS Profile** and the **region** and **stage** specified in your `sst.json`.

Or if you want to deploy to a different stage.

```bash
npm run deploy --stage prod
```

And if your prod environment is in a different AWS account or region, you can do:

```bash
AWS_PROFILE=my-profile npm run deploy --stage prod --region eu-west-1
```

:::note
If you are using `npm run deploy`, you'll need to add an extra `--` for the options.
:::

For example, to set the stage and region:

```bash
npm run deploy -- --stage prod --region eu-west-1
```

## Removing an app

Finally, you can remove all your stacks and their resources from AWS using.

```bash
# With npm
npm run remove
# Or with Yarn
yarn remove
```

Or if you've deployed to a different stage.

```bash
npm run remove --stage prod
```

Note that this command permanently removes your resources from AWS. It also removes the stack that's created as a part of the debugger.
