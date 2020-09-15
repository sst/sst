# Serverless Stack Toolkit (SST) [![npm](https://img.shields.io/npm/v/@serverless-stack/cli.svg)](https://www.npmjs.com/package/@serverless-stack/cli) [![Build Status](https://github.com/serverless-stack/serverless-stack/workflows/CI/badge.svg)](https://github.com/serverless-stack/serverless-stack/actions)

Serverless Stack Toolkit (SST) is an extension of [AWS CDK](https://aws.amazon.com/cdk/) that:

- Allows you to use **CDK with Serverless Framework**
- And speeds up your deployments by **deploying all your stacks concurrently**!

## Quick Start

Create and deploy your first SST app.

```bash
$ npx create-serverless-stack resources my-sst-app
$ cd my-sst-app
$ npx sst deploy
```

## Table of Contents

- [Background](#background)
- [Usage](#usage)
  - [Creating an app](#creating-an-app)
  - [Working on your app](#working-on-your-app)
  - [Building your app](#building-your-app)
  - [Deploying your app](#deploying-your-app)
  - [Removing an app](#removing-an-app)
  - [Package scripts](#package-scripts)
  - [Testing your app](#testing-your-app)
  - [Linting your code](#linting-your-code)
- [Migrating From CDK](#migrating-from-cdk)
- [Known Issues](#known-issues)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [Running Locally](#running-locally)
- [References](#references)
  - [`@serverless-stack/cli`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/cli)
  - [`create-serverless-stack`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/create-serverless-stack)
  - [`@serverless-stack/resources`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/resources)
- [Community](#community)

---

## Background

Serverless Framework is great for deploying your Lambda functions. But deploying any other AWS resources requires you to write CloudFormation templates in YAML. CloudFormation templates are incredibly verbose and even creating simple resources can take hundreds of lines of YAML. AWS CDK solves this by allowing you to generate CloudFormation templates using modern programming languages. Making it truly, _infrastructure as code_.

### Using Serverless Framework with CDK

However, to use AWS CDK (to define your non-Lambda resources) alongside your Serverless Framework services, requires you to follow certain conventions.

- **Deploying all the stacks to the same region and AWS account**

  Serverless Framework apps are deployed multiple times to each environment. Where each deployment uses the same region and AWS account. This is done using the `--region` and `AWS_PROFILE=profile` options as a part of the deploy command. CDK apps on the other hand, contains CloudFormation stacks that are deployed to multiple regions and AWS accounts simultaneously.

- **Prefixing stage and resource names**

  Since the same app is deployed to multiple environments, the AWS resource names might thrash if you are using the same AWS account across environments. To avoid this, Serverless Framework adopts the practice of prefixing the stack (and other resource) names with the stage name. On the other hand, to deploy a CDK app to the multiple stages, you'd need to manually ensure that the stack names and resource names don't thrash.

SST provides the above out-of-the-box. So you can deploy your Lambda functions using:

```bash
$ AWS_PROFILE=production serverless deploy --stage prod --region us-east-1
```

And use CDK for the rest of your AWS infrastructure:

```bash
$ AWS_PROFILE=production npx sst deploy --stage prod --region us-east-1
```

Making it really easy for you to start using CDK to create your AWS infrastructure. While still continuing to use Serverless Framework for your Lambda functions.

### Speeding up CDK

Finally, AWS CDK deployments are currently very slow. CDK deploys your CloudFormation stacks in sequence. It'll submit a CloudFormation template for deployment and wait till it completes before starting the next one. This means that CDK deployments for large apps can easily take at least half an hour. SST fixes this by deploying your CloudFormation stacks concurrently. It uses [a forked version of AWS CDK](https://github.com/serverless-stack/sst-cdk) internally to do this.

### And more

As a bonus, SST also supports deploying your CloudFormation stacks asynchronously. So you don't have to waste CI build minutes waiting for CloudFormation to complete. [Seed](https://seed.run) natively supports concurrent asynchronous deployments for your SST apps. Making it really fast and virtually free to deploy!

SST also comes with a few other niceties:

- Supports ES6 (and TypeScript) out-of-the-box
- Automatically lints your CDK code using [ESLint](https://eslint.org/)
- Runs your CDK unit tests using [Jest](https://jestjs.io/)

## Usage

### Creating an app

Create a new project using.

```bash
$ npx create-serverless-stack resources my-sst-app
```

Or alternatively, with a newer version of npm or Yarn.

```bash
# With npm 6+
$ npm init serverless-stack resources my-sst-app
# Or with Yarn 0.25+
$ yarn create serverless-stack resources my-sst-app
```

This by default creates a JavaScript/ES6 project. If you instead want to use **TypeScript**.

```bash
$ npm init serverless-stack resources my-sst-app --language typescript
```

By default your project is using npm as the package manager, if you'd like to use **Yarn**.

```bash
$ npm init serverless-stack resources my-sst-app --use-yarn
```

You can read more about the [**create-serverless-stack** CLI here](https://github.com/serverless-stack/serverless-stack/tree/master/packages/create-serverless-stack).

### Working on your app

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
└── lib
    ├── MyStack.js
    └── index.js
```

It includes a config file in `sst.json`.

```json
{
  "name": "my-sst-app",
  "type": "@serverless-stack/resources",
  "stage": "dev",
  "region": "us-east-1"
}
```

The **stage** and the **region** are defaults for your app and can be overridden using the `--stage` and `--region` options. The **name** is used while prefixing your stack and resource names. And the **type** just tells the CLI to know which type of SST app this is.

The `lib/index.js` file is the entry point for your app. It has a default export function to add your stacks.

```jsx
import MyStack from "./MyStack";

export default function main(app) {
  new MyStack(app, "my-stack");

  // Add more stacks
}
```

Here you'll be able to access the stage, region, and name of your app using.

``` js
app.stage   // "dev"
app.region  // "us-east-1"
app.name    // "my-sst-app"
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

``` js
this.node.root.stage   // "dev"
this.node.root.region  // "us-east-1"
this.node.root.name    // "my-sst-app"
```

And if you need to prefix certain resource names so that they don't thrash when deployed to multiple stages, you can do the following in your stacks.

```jsx
this.node.root.logicalPrefixedName("MyResource")  // "dev-my-sst-app-MyResource"
```

You can read more about [**@serverless-stack/resources** here](https://github.com/serverless-stack/serverless-stack/tree/master/packages/resources).

### Building your app

Once you are ready to build your app and convert your CDK code to CloudFormation, run the following from your project root.

```bash
# With npm
$ npx sst build
# Or with Yarn
$ yarn sst build
```

This will compile your ES6 (or TS) code to the `build/` directory in your app. And the synthesized CloudFormation templates are outputted to `build/cdk.out/`. Note that, you shouldn't commit the `build/` directory to source control and it's ignored by default in your project's `.gitignore`.

### Deploying your app

Once your app has been built and tested successfully. You are ready to deploy it to AWS.

```bash
# With npm
$ npx sst deploy
# Or with Yarn
$ yarn sst deploy
```

This uses your **default AWS Profile**. And the **region** and **stage** specified in your `sst.json`. You can deploy using a specific AWS profile, stage, and region by running.

```bash
$ AWS_PROFILE=my-profile npx sst deploy --stage prod --region eu-west-1
```

### Removing an app

Finally, you can remove all your stacks and their resources from AWS using.

```bash
# With npm
$ npx sst remove
# Or with Yarn
$ yarn sst remove
```

Note that, this permanently removes your resources from AWS.

### Package scripts

The above commands (`build`, `deploy`, and `remove`) are also available in your `package.json`. So you can run them using.

```bash
# With npm
$ npm run <command>
# Or with Yarn
$ yarn run <command>
```

Just note that for `npm run`, you'll need to use an extra `--` for the options. For example:

```bash
$ npm run build -- --stage alpha
```

### Testing your app

You can run your tests using.

```bash
# With npm
$ npm test
# Or with Yarn
$ yarn test
```

### Linting your code

Your code is automatically linted when building or deploying. If you'd like to customize the lint rules, add a `.eslintrc.json` in your project root. If you'd like to turn off linting, add `*` to an `.eslintignore` file in your project root.

## Migrating From CDK

It's fairly simple to move a CDK app to SST. There are a couple of small differences between the two:

1. There is no `cdk.json`

   If you have a `context` block in your `cdk.json`, you can move it to a `cdk.context.json`. You can [read more about this here](https://docs.aws.amazon.com/cdk/latest/guide/context.html). You'll also need to add a `sst.json` config file, as talked about above. Here is a sample config for reference.
   
   ``` json
   {
     "name": "my-sst-app",
     "type": "@serverless-stack/resources",
     "stage": "dev",
     "region": "us-east-1"
   }
   ```
   
2. There is no `bin/*.js`

   Instead there is a `lib/index.js` that has a default export function where you can add your stacks. SST creates the App object for you. This is what allows SST to ensure that the stage, region, and AWS accounts are set uniformly across all the stacks. Here is a sample `lib/index.js` for reference.
   
   ``` js
   import MyStack from "./MyStack";

   export default function main(app) {
     new MyStack(app, "my-stack");

     // Add more stacks
   }
   ```

3. Stacks extend `sst.Stack`

   Your stack classes extend `sst.Stack` instead of `cdk.Stack`. Here is what the JavaScript version looks like.
   
   ``` js
   import * as sst from "@serverless-stack/resources";
   
   export default class MyStack extends sst.Stack {
     constructor(scope, id, props) { }
   }
   ```
   
   And in TypeScript.
   
   ``` ts
   import * as sst from "@serverless-stack/resources";
   
   export class MyStack extends sst.Stack {
     constructor(scope: sst.App, id: string, props?: sst.StackProps) { }
   }
   ```
 
4. Include the right packages

   You don't need the `aws-cdk` package in your `package.json`. Instead you'll need `@serverless-stack/cli` and `@serverless-stack/resources`.

## Known Issues

There is a known issue in AWS CDK when using mismatched versions of their NPM packages. This means that all your AWS CDK packages in your `package.json` should use the same exact version. And since sst uses a forked version of AWS CDK internally, this means that your app needs to use the same versions as well.

To help with this, sst will show a message to let you know if you might potentially run into this issue. And help you fix it.

```bash
Mismatched versions of AWS CDK packages. Serverless Stack currently supports 1.55.0. Fix using:

  npm install @aws-cdk/aws-cognito@1.55.0 --save-exact
```

You can learn more about these issues [here](https://github.com/aws/aws-cdk/issues/9578) and [here](https://github.com/aws/aws-cdk/issues/542).

## Future Roadmap

- Add support for other AWS CDK languages

## Contributing

- Open [a new issue](https://github.com/serverless-stack/serverless-stack/issues/new) if you've found a bug or have some suggestions.
- Or submit a pull request!

## Running Locally

To run this project locally, clone the repo and initialize the project.

```bash
$ git clone https://github.com/serverless-stack/serverless-stack.git
$ cd serverless-stack
$ yarn
```

Run all the tests.

```bash
$ yarn test
```

## References

- [`@serverless-stack/cli`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/cli)
- [`create-serverless-stack`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/create-serverless-stack)
- [`@serverless-stack/resources`](https://github.com/serverless-stack/serverless-stack/tree/master/packages/resources)

## Community

[Follow us on Twitter](https://twitter.com/ServerlessStack), [join our chatroom](https://gitter.im/serverless-stack/Lobby), or [post on our forums](https://discourse.serverless-stack.com).

## Thanks

This project extends [AWS CDK](https://github.com/aws/aws-cdk) and is based on the ideas from [Create React App](https://www.github.com/facebook/create-react-app).

---

Brought to you by [Anomaly Innovations](https://anoma.ly/); makers of [Seed](https://seed.run/) and the [Serverless Stack Guide](https://serverless-stack.com/).
