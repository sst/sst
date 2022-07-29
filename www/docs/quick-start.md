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
npm init sst@latest my-sst-app
cd my-sst-app
npm install
```

</TabItem>
<TabItem value="npx">

```bash
npx create-sst@latest my-sst-app
cd my-sst-app
npm install
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst my-sst-app
cd my-sst-app
yarn
```

</TabItem>
</MultiPackagerCode>

## Starting local environment

The first time the SST command is run, you'll be prompted to enter a default stage name to use. The stage name will be stored locally in a .sst/ directory. This directory is automatically ignore from Git.

The initial deploy can around 5-10 minutes. It will deploy your app to AWS, and also setup [Live Lambda dev](live-lambda-development.md) environment.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm run start
```

</TabItem>
<TabItem value="npx">

```bash
npx sst start
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run start
```

</TabItem>
</MultiPackagerCode>

This command uses your **default AWS Profile** and the **region** specified in your `sst.json`. If you want to use a different AWS account or region, you can do:

<MultiPackagerCode>
<TabItem value="npm">

```bash
# requires an extra `--` for the options
AWS_PROFILE=my-profile npm run start -- --region eu-west-1
```

</TabItem>
<TabItem value="npx">

```bash
AWS_PROFILE=my-profile npx sst start --region eu-west-1
```

</TabItem>
<TabItem value="yarn">

```bash
AWS_PROFILE=my-profile yarn run start --region eu-west-1
```

</TabItem>
</MultiPackagerCode>

### Using SST Console

The SST Console is a web based dashboard to manage your SST apps. Once `sst start` is up and running, you should see the following printed out in the terminal.

```bash
==========================
Starting Live Lambda Dev
==========================

SST Console: https://console.serverless-stack.com/my-sst-app/frank/local
Debug session started. Listening for requests...
```

Open the [SST Console](console.md) in the browser.

![SST Console homescreen](/img/console/sst-console-homescreen.png)

## Deploying an app

Once your app has been built and tested successfully, you are ready to deploy it to AWS.

<MultiPackagerCode>
<TabItem value="npm">

```bash
# requires an extra `--` for the options
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

Similarly, to deploy to a different AWS account or region, you can do:

<MultiPackagerCode>
<TabItem value="npm">

```bash
# requires an extra `--` for the options
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

### Using SST Console

This allows you look at logs in production and manage resources in production as well.

<MultiPackagerCode>
<TabItem value="npm">

```bash
# requires an extra `--` for the options
npm run console -- --stage prod
```

</TabItem>
<TabItem value="npx">

```bash
npx sst console --stage prod
```

</TabItem>
<TabItem value="yarn">

```bash
yarn run console --stage prod
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
# requires an extra `--` for the options
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
