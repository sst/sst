---
title: Create a New Project
---

import ChangeText from "@site/src/components/ChangeText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

Let's create our first SST app!

## Prerequisites

- SST is built with Node, so make sure your local machine has it installed; [Node.js 16](https://nodejs.org/) and [npm 7](https://www.npmjs.com/).
- And we'll need a code editor. We use [VS Code](https://code.visualstudio.com/) in this tutorial.
- Some basic TypeScript, AWS, or React knowledge would help, but it's not necessary.

---

## Configure AWS credentials

You also need to have an AWS account and AWS credentials configured locally. If you haven't already, [**follow these steps**](../advanced/iam-credentials.md#loading-from-a-file).

---

## Create a new app

<ChangeText>

Let's create our starter. We'll be using the [`create sst`](../packages/create-sst.md) CLI.

</ChangeText>
<MultiPackagerCode>
<TabItem value="npm">

```bash
npx create-sst@latest --template=graphql/rds
```

</TabItem>
<TabItem value="yarn">

```bash
yarn create sst --template=graphql/rds
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm create sst --template=graphql/rds
```

</TabItem>
</MultiPackagerCode>

:::tip
In this tutorial, we'll be using the **keyboard icon** <img width="18" style={{ "margin": "0 4px", "vertical-align": "text-bottom" }} src="/img/components/keyboard.svg" /> for code snippets where we want you to **make a change**.
:::

Select a name for your app. We'll just use the default.

```bash
? Project name (my-sst-app)
```

<ChangeText>

Next, install the dependencies.

</ChangeText>

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
<TabItem value="pnpm">

```bash
cd my-sst-app
pnpm install
```

</TabItem>
</MultiPackagerCode>

The `create sst` CLI by default bootstraps a full-stack starter that we'll be using in this tutorial. It can also create a more minimal setup, if you don't pass in `--template`. We recommend going that route if you want to piece your stack together.

---

## Start Live Lambda Dev

<ChangeText>

Let's start our local development environment. Or what SST calls [Live Lambda Dev](../live-lambda-development.md).

</ChangeText>

```bash
npx sst dev
```

The first time the SST command is run, you'll be prompted to enter a default stage name to use. The stage name will be stored locally in a `.sst/` directory; it's automatically ignored from Git.

```
Look like you’re running sst for the first time in this directory. Please enter
a stage name you’d like to use locally. Or hit enter to use the one based on
your AWS credentials (Jay):
```

SST uses the stage names to namespace your resources. So if you and your teammate are working on the same app in the same AWS account, the infrastructure will be kept separate.

SST will automatically suggest a stage name based on the AWS credentials you are using. Hit **_Enter_** to use the suggested one.

:::tip
Make sure to use a unique stage name when working on an SST app locally.
:::

Or if you are picking your own, make sure to use a stage name that is specific to you.

---

### About `sst dev`

The `sst dev` command, as you might've guessed, deploys to your AWS account. It does a couple of interesting things:

1. Bootstraps your AWS account for SST. This only needs to be done once per account.
1. Setups up the [Live Lambda Dev environment](../live-lambda-development.md).
1. Deploys your app to AWS.
1. Runs a local server to:
   1. Proxy Lambda requests to your local machine.
   2. Power the [SST Console](../console.md). More on this later.

:::info
The `sst dev` command starts up the [Live Lambda Dev](../live-lambda-development.md) environment.
:::

The first time you run `sst dev` in a new AWS region and account, it can take around 5 minutes to set everything up.

---

## Editor integration

While `sst dev` is starting up, let's open your project in your code editor. We are using VS Code in our case.

SST is designed to integrate really well with your code editor. It features automatic support for:

1. Breakpoint debugging
2. Type checking
3. Autocomplete
4. Inline docs

You can read more about this over on our doc on [Editor Integration](../editor-integration.md).

---

Next, let's take a look at the [project structure](project-structure.md) of an SST app.
