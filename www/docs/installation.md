---
id: installation
title: Installation
description: "Creating a new Serverless Stack (SST) app"
---

import config from "../config";

SST is a collection of <a href={ `${ config.github }/tree/master/packages` }>npm packages</a> that allow you to create a serverless app.

You can define your apps with a combination of Infrastructure as Code (using [CDK](https://aws.amazon.com/cdk/)) and Lambda functions.

## Requirements

- [Node.js](https://nodejs.org/en/download/) >= 10.15.1
- An [AWS account](https://serverless-stack.com/chapters/create-an-aws-account.html) with the [AWS CLI configured locally](https://serverless-stack.com/chapters/configure-the-aws-cli.html)

## Language support

SST supports JavaScript, TypeScript, Python, and Golang.

| Language   |      CDK      | Lambda |
| ---------- | :-----------: | :----: |
| JavaScript |       ✓       |   ✓    |
| TypeScript |       ✓       |   ✓    |
| Go         | _Coming soon_ |   ✓    |
| Python     | _Coming soon_ |   ✓    |

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

This by default creates a JavaScript/ES project. If you instead want to use **TypeScript**.

```bash
npx create-serverless-stack@latest my-sst-app --language typescript
```

Or if you want to use **Python**.

```bash
npx create-serverless-stack@latest my-sst-app --language python
```

Or if you want to use **Go**.

```bash
npx create-serverless-stack@latest my-sst-app --language go
```

By default your project is using npm as the package manager, if you'd like to use **Yarn**.

```bash
npx create-serverless-stack@latest my-sst-app --use-yarn
```

Note that, if you are using `npm init`, you'll need to add an extra `--` before the options.

```bash
npm init serverless-stack@latest my-sst-app -- --language typescript
```

You can read more about the [**create-serverless-stack** CLI here](packages/create-serverless-stack.md).

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
├── lib
|   ├── MyStack.js
|   └── index.js
└── src
    └── lambda.js
```

An SST app is made up of a couple of parts.

- `lib/` — App Infrastructure

  The code that describes the infrastructure of your serverless app is placed in the `lib/` directory of your project. SST uses [AWS CDK](https://aws.amazon.com/cdk/), to create the infrastructure.

- `src/` — App Code

  The code that’s run when your app is invoked is placed in the `src/` directory of your project. These are your Lambda functions.

- `test/` — Unit tests

  There's also a `test/` directory where you can add your tests. SST uses [Jest](https://jestjs.io/) internally to run your tests.

You can change this structure around to fit your workflow. This is just a good way to get started.

### Infrastructure

The `lib/index.js` file is the entry point for defining the infrastructure of your app. It has a default export function to add your stacks.

```jsx title="lib/index.js"
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

You'll notice that we are using `import` and `export`. This is because SST automatically transpiles your ES (and TypeScript) code using [esbuild](https://esbuild.github.io/).

In the sample `lib/MyStack.js` you can add the resources to your stack.

```jsx title="lib/MyStack.js"
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
  "stage": "dev",
  "region": "us-east-1",
  "lint": true,
  "typeCheck": true,
  "main": "infra/index.ts" // Optional => Defaults to "lib/index.(ts/js)
}
```

The **stage** and the **region** are defaults for your app and can be overridden using the `--stage` and `--region` options. The **name** is used while prefixing your stack and resource names. The **main** is the entry file to your app, defaults to `lib/index.ts` or `lib/index.js` for typescript and Javascript respectively, when you haven't specified the field.

For JavaScript and TypeScript apps, SST automatically lints your CDK and Lambda function code using [ESLint](https://eslint.org). The **lint** option allows you to turn this off.

For TypeScript apps, SST also automatically type checks your CDK and Lambda function code using [tsc](https://www.typescriptlang.org). The **typeCheck** option allows you to turn this off.

You'll be able to access the stage, region, and name of your app in `lib/index.js`.

```js
app.stage; // "dev"
app.region; // "us-east-1"
app.name; // "my-sst-app"
```

You can also access them in your stacks, `lib/MyStack.js`.

```js
class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    scope.stage; // "dev"
    scope.region; // "us-east-1"
    scope.name; // "my-sst-app"
  }
}
```

And in TypeScript.

```ts
class MyStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    scope.stage; // "dev"
    scope.region; // "us-east-1"
    scope.name; // "my-sst-app"
  }
}
```

You can read more about [the additional set of constructs that SST provides here](packages/resources.md).
