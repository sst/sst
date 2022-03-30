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
npx create-serverless-stack@latest my-sst-app
```

Or alternatively, with a newer version of npm or Yarn.

```bash
# With npm 6+
npm init serverless-stack@latest my-sst-app
# Or with Yarn 0.25+
yarn create serverless-stack my-sst-app
```

By default your project is using npm as the package manager, if you'd like to use **Yarn**.

```bash
npx create-serverless-stack@latest my-sst-app --use-yarn
```

Note that, if you are using `npm init`, you'll need to add an extra `--` before the options.

```bash
npm init serverless-stack@latest my-sst-app -- --language typescript
```

This by default creates a JavaScript/ES project.

### TypeScript

If you instead want to use **TypeScript**.

```bash
npx create-serverless-stack@latest my-sst-app --language typescript
```

### Python

Or if you want to use **Python**.

```bash
npx create-serverless-stack@latest my-sst-app --language python
```

### Golang

Or if you want to use **Go**.

```bash
npx create-serverless-stack@latest my-sst-app --language go
```

### C#

Or if you want to use **C#**.

```bash
npx create-serverless-stack@latest my-sst-app --language csharp
```

### F#

Or if you want to use **F#**.

```bash
npx create-serverless-stack@latest my-sst-app --language fsharp
```

You can read more about the [**create-serverless-stack** CLI here](packages/create-serverless-stack.md).

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
├── test
│   └── MyStack.test.js
├── stacks
|   ├── MyStack.js
|   └── index.js
└── src
    └── lambda.js
```

An SST app is made up of a couple of parts.

- `stacks/` — App Infrastructure

  The code that describes the infrastructure of your serverless app is placed in the `stacks/` directory of your project. SST uses [AWS CDK](https://aws.amazon.com/cdk/), to create the infrastructure.

- `src/` — App Code

  The code that’s run when your app is invoked is placed in the `src/` directory of your project. These are your Lambda functions.

- `test/` — Unit tests

  There's also a `test/` directory where you can add your tests. SST uses [Jest](https://jestjs.io/) internally to run your tests.

You can change this structure around to fit your workflow. This is just a good way to get started.

### Infrastructure

The `stacks/index.js` file is the entry point for defining the infrastructure of your app. It has a default export function to add your stacks.

```jsx title="stacks/index.js"
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

You'll notice that we are using `import` and `export`. This is because SST automatically transpiles your ES (and TypeScript) code using [esbuild](https://esbuild.github.io/).

In the sample `stacks/MyStack.js` you can add the resources to your stack.

```jsx title="stacks/MyStack.js"
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Define your stack
  }
}
```

Note that the stacks in SST use [`sst.Stack`](constructs/Stack.md) as opposed to `cdk.Stack`. This allows us to deploy the same stack to multiple environments.

In the sample app we are using [a higher-level API construct](constructs/Api.md) to define a simple API endpoint.

```js
const api = new sst.Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.handler",
  },
});
```

### Functions

The above API endpoint invokes the `handler` function in `src/lambda.js`.

```js title="src/lambda.js"
export async function handler() {
  return {
    statusCode: 200,
    body: "Hello World!",
    headers: { "Content-Type": "text/plain" },
  };
}
```

Notice that we are using `export` here as well. SST also transpiles your function code.

## Project config

Your SST app also includes a config file in `sst.json`.

```json title="sst.json"
{
  "name": "my-sst-app",
  "region": "us-east-1",
  "lint": true,
  "typeCheck": true,
  "main": "infra/index.ts"
}
```

Let's look at these options in detail.

- **name**

  Used while prefixing your stack and resource names.

- **region**

  Defaults for your app and can be overridden using the [`--region`](packages/cli.md#--region) CLI option.

- **lint**

  For JavaScript and TypeScript apps, SST automatically lints your CDK and Lambda function code using [ESLint](https://eslint.org). The **lint** option allows you to turn this off.

- **typeCheck**

  For TypeScript apps, SST also automatically type checks your CDK and Lambda function code using [tsc](https://www.typescriptlang.org). The **typeCheck** option allows you to turn this off.

- **main**

  The entry point to your SST app. Defaults to `stacks/index.ts` or `stacks/index.js` for TypeScript and JavaScript respectively.

Note that, you can access the **stage**, **region**, and **name** in the entry point of your app.

```js title="stacks/index.js"
app.stage; // "dev"
app.region; // "us-east-1"
app.name; // "my-sst-app"
```

You can also access them in your stacks.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/MyStack.js"
class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    scope.stage; // "dev"
    scope.region; // "us-east-1"
    scope.name; // "my-sst-app"
  }
}
```

</TabItem>
<TabItem value="ts">

```ts title="stacks/MyStack.ts"
class MyStack extends sst.Stack {
  constructor(
    scope: sst.App, id: string, props?: sst.StackProps
  ) {
    super(scope, id, props);

    scope.stage; // "dev"
    scope.region; // "us-east-1"
    scope.name; // "my-sst-app"
  }
}
```

</TabItem>
</MultiLanguageCode>

## Building your app

Once you are ready to build your app and convert your CDK code to CloudFormation, run the following from your project root.

```bash
# With npm
npx sst build
# Or with Yarn
yarn sst build
```

This will compile your ES (or TS) code to the `.build/` directory in your app. And the synthesized CloudFormation templates are outputted to `.build/cdk.out/`. Note that, you shouldn't commit the `.build/` directory to source control and it's ignored by default in your project's `.gitignore`.

## Deploying an app

Once your app has been built and tested successfully, you are ready to deploy it to AWS.

```bash
# With npm
npx sst deploy
# Or with Yarn
yarn sst deploy
```

This command uses your **default AWS Profile** and the **region** and **stage** specified in your `sst.json`.

Or if you want to deploy to a different stage.

```bash
npx sst deploy --stage prod
```

And if your prod environment is in a different AWS account or region, you can do:

```bash
AWS_PROFILE=my-profile npx sst deploy --stage prod --region eu-west-1
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
npx sst remove
# Or with Yarn
yarn sst remove
```

Or if you've deployed to a different stage.

```bash
npx sst remove --stage prod
```

Note that this command permanently removes your resources from AWS. It also removes the stack that's created as a part of the debugger.
