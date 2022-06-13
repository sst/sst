---
id: installation
title: Installation
sidebar_label: Quick Start
description: "Creating a new Serverless Stack (SST) app"
---

import config from "../config";
import TabItem from "@theme/TabItem";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

SST is a collection of <a href={ `${ config.github }/tree/master/packages` }>npm packages</a> that allow you to create a serverless app. You can define your apps with a combination of Infrastructure as Code (using [CDK](https://aws.amazon.com/cdk/)) and Lambda functions.

To use SST you'll need:

- [Node.js](https://nodejs.org/en/download/) >= 10.15.1
- An [AWS account](https://serverless-stack.com/chapters/create-an-aws-account.html) with the [AWS CLI configured locally](https://serverless-stack.com/chapters/configure-the-aws-cli.html)

## Getting started

Create a new project using.

<MultiPackagerCode>
<TabItem value="npx">

```bash
npx create-sst@latest
```

</TabItem>
<TabItem value="npm">

```bash
npm init sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst
```

</TabItem>
</MultiPackagerCode>

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
npx sst deploy --stage prod --region eu-west-1
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
