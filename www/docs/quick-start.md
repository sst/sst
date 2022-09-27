---
id: quick-start
title: Quick Start
description: "Create a new SST app"
---

import config from "../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

export const ConsoleUrl = ({url}) =>
<a href={url}>{url.replace("https://","").replace(/\/$/, "")}</a>;

<HeadlineText>

SST is a collection of <a href={ `${ config.github }/tree/master/packages` }>npm packages</a> that allow you to define your infrastructure, write functions, connect and deploy your frontend.

</HeadlineText>

---

## 0. Prerequisites

SST is built with Node, so make sure your local machine has it installed; [Node.js 14](https://nodejs.org/) and [npm 7](https://www.npmjs.com/).

---

### AWS credentials

You also need to have an AWS account and AWS credentials configured locally. If you haven't already, [**follow these steps**](advanced/iam-credentials.md#loading-from-a-file).

---

## 1. Create a new app

Create a new SST app using the [`create-sst`](packages/create-sst.md) CLI.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest my-sst-app
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst my-sst-app
```

</TabItem>
</MultiPackagerCode>

---

### Pick a starter

This'll prompt you to select a starter.

```bash
? What kind of project do you want to create? (Use arrow keys)
❯ graphql
  minimal
  examples
```

The `graphql` starter is a full-stack TypeScript app organized as a monorepo. It comes with a GraphQL API, a frontend React app, and all of our best practices. Let's pick that.

This'll prompt you to select a database; either [RDS](https://aws.amazon.com/rds/) (PostgreSQL or MySQL) or [DynamoDB](https://aws.amazon.com/dynamodb/).

```bash
? Select a database (you can change this later or use both) (Use arrow keys)
  RDS (Postgres or MySQL)
❯ DynamoDB
```

Let's use DynamoDB for now. If you want to use PostgreSQL, [check out our tutorial](learn/index.md), we cover it in detail.

---

### Install dependencies

Next install the dependencies.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd my-sst-app
npm install
```

</TabItem>
<TabItem value="yarn">

```bash
cd my-sst-app
yarn
```

</TabItem>
</MultiPackagerCode>

---

## 2. Start local environment

Let's start the [Live Lambda](live-lambda-development.md) local development environment.

<MultiPackagerCode>
<TabItem value="npm">

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

The first time the SST command is run, you'll be prompted to enter a default stage name to use.

---

### Pick a stage name

SST uses the stage names to namespace your resources. Just hit **Enter** to select the default one.

```
Look like you’re running sst for the first time in this directory. Please enter
a stage name you’d like to use locally. Or hit enter to use the one based on
your AWS credentials (Jay):
```

The namespaced resources lets SST deploy multiple environments of the same app to the same AWS account. So you and your teammates can work together.

:::info
The stage name will be stored locally in a `.sst/` directory. It's automatically ignored from Git.
:::

The initial deploy can take a few minutes. It will deploy your app to AWS, and also setup the infrastructure to support your local development environment.

Once complete, you'll see something like this.

```bash
==========================
 Starting Live Lambda Dev
==========================

SST Console: https://console.sst.dev/my-sst-app/Jay/local
Done building pothos schema
Debug session started. Listening for requests...
```

Now our app has been deployed to AWS and it's connect to our local machine so we can make our changes live.

---

### Start the frontend

The frontend in our starter is a React app created with [Vite](https://vitejs.dev). Let's start it locally from the `web/` directory.

<MultiPackagerCode>
<TabItem value="npm">

```bash
cd web
npm run dev
```

</TabItem>
<TabItem value="yarn">

```bash
cd web
yarn run dev
```

</TabItem>
</MultiPackagerCode>

Once complete, you can naviate to the URL in your output — `http://localhost:3000/`

![SST starter homepage](/img/quick-start/sst-starter-homepage.png)

You should see the homepage of our starter! It's a simple Reddit clone where you can post links.

---

### Open the console

This also starts the [SST Console](console.md), a web based dashboard to manage your apps.

Head over to the URL above or simply — **<ConsoleUrl url={config.console} />**

![SST Console homescreen](/img/console/sst-console-homescreen.png)

---

## Deploying an app

Once your app has been built and tested successfully, you are ready to deploy it to AWS.

<MultiPackagerCode>
<TabItem value="npm">

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
