---
id: quick-start
title: Quick Start
description: "Create a new SST app"
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
<TabItem value="npm">

```bash
npm init sst@latest
```

</TabItem>
<TabItem value="npx">

```bash
npx create-sst@latest
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst
```

</TabItem>
</MultiPackagerCode>

If you would like to use a more minimal starter you can pass in `--minimal` to see all the options.

## Building your app

Once you are ready to build your app and convert your CDK code to CloudFormation, run the following from your project root.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run build
```

</TabItem>
<TabItem value="npx">

```bash
npx sst build
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run build
```

</TabItem>
</MultiPackagerCode>

This will compile your ES (or TS) code to the `.build/` directory in your app. And the synthesized CloudFormation templates are outputted to `.build/cdk.out/`. Note that, you shouldn't commit the `.build/` directory to source control and it's ignored by default in your project's `.gitignore`.

## Deploying an app

Once your app has been built and tested successfully, you are ready to deploy it to AWS.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run deploy
```

</TabItem>
<TabItem value="npx">

```bash
npx sst deploy
```

</TabItem>
<TabItem value="yarn">

```bash
yarn deploy
```

</TabItem>
</MultiPackagerCode>

This command uses your **default AWS Profile** and the **region** and **stage** specified in your `sst.json`.

Or if you want to deploy to a different stage.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run deploy -- --stage prod
```

</TabItem>
<TabItem value="npx">

```bash
npx sst deploy --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run deploy --stage prod
```

</TabItem>
</MultiPackagerCode>

And if your prod environment is in a different AWS account or region, you can do:

<MultiPackagerCode>
<TabItem value="npm">

```bash
AWS_PROFILE=my-profile npm run deploy -- --stage prod --region eu-west-1
```

</TabItem>
<TabItem value="npx">

```bash
AWS_PROFILE=my-profile npx sst deploy --stage prod --region eu-west-1
```

</TabItem>
<TabItem value="yarn">

```bash
AWS_PROFILE=my-profile yarn run deploy --stage prod --region eu-west-1
```

</TabItem>
</MultiPackagerCode>

:::note
If you are using `npm run deploy`, you'll need to add an extra `--` for the options.
:::

For example, to set the stage and region:

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run deploy -- --stage prod --region eu-west-1
```

</TabItem>
<TabItem value="npx">

```bash
npx sst deploy --stage prod --region eu-west-1
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run deploy --stage prod --region eu-west-1
```

</TabItem>
</MultiPackagerCode>

## Removing an app

Finally, you can remove all your stacks and their resources from AWS using.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run remove
```

</TabItem>
<TabItem value="npx">

```bash
npx sst remove
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run remove
```

</TabItem>
</MultiPackagerCode>

Or if you've deployed to a different stage.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run remove -- --stage prod
```

</TabItem>
<TabItem value="npx">

```bash
npx sst remove --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run remove --stage prod
```

</TabItem>
</MultiPackagerCode>

Note that this command permanently removes your resources from AWS. It also removes the stack that's created as a part of the debugger.
