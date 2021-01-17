---
id: installation
title: Installation
---

import config from "../config";

SST is a collection of <a href={ `${ config.github }/tree/master/packages` }>npm packages</a>.

## Requirements

[Node.js](https://nodejs.org/en/download/) version >= `10.15.1` or above (which can be checked by running `node -v`). You can use [nvm](https://github.com/nvm-sh/nvm) for managing multiple Node versions on a single machine installed

## Getting Started

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
npm init serverless-stack@latest my-sst-app --language typescript
```

By default your project is using npm as the package manager, if you'd like to use **Yarn**.

```bash
npm init serverless-stack@latest my-sst-app --use-yarn
```

You can read more about the [**create-serverless-stack** CLI here](packages/create-serverless-stack.md).

## App Structure

Your app starts with a simple project structure.

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

It includes a config file in `sst.json`.

```json
{
  "name": "my-sst-app",
  "stage": "dev",
  "region": "us-east-1"
}
```

The **stage** and the **region** are defaults for your app and can be overridden using the `--stage` and `--region` options. The **name** is used while prefixing your stack and resource names.

The `lib/index.js` file is the entry point for your app. It has a default export function to add your stacks.

```jsx
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

Here you'll be able to access the stage, region, and name of your app using.

```js
app.stage; // "dev"
app.region; // "us-east-1"
app.name; // "my-sst-app"
```

In the sample `lib/MyStack.js` you can add the resources to your stack.

```jsx
import * as sst from "@serverless-stack/resources";

export default class MyStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Define your stack
  }
}
```

Note that the stacks in SST use `sst.Stack` as imported from `@serverless-stack/resources`. As opposed to `cdk.Stack`. This is what allows SST to make sure that your stack names are prefixed with the stage names and are deployed to the region and AWS account that's specified through the CLI.

You can access the stage, region, and name of your app using.

```js
this.node.root.stage; // "dev"
this.node.root.region; // "us-east-1"
this.node.root.name; // "my-sst-app"
```

And if you need to prefix certain resource names so that they don't thrash when deployed to multiple stages, you can do the following in your stacks.

```js
this.node.root.logicalPrefixedName("MyResource"); // "dev-my-sst-app-MyResource"
```

The sample stack also comes with a Lambda function and API endpoint. The Lambda function is in the `src/` directory.

```js
new sst.Function(this, "Lambda", {
  entry: "src/lambda.js",
});
```

Notice that we are using the `sst.Function` instead of the `cdk.lambda.NodejsFunction`. This allows SST to locally invoke a deployed Lambda function.

You can read more about [**@serverless-stack/resources** here](packages/resources.md).
