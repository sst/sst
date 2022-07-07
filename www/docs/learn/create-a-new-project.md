---
title: Create a New Project
---

import ChangeText from "@site/src/components/ChangeText";

Let's create our first SST app.

### Prerequisites

SST is built with Node.js, so make sure your local machine has it installed; [Node.js 14](https://nodejs.org/) and [npm 7](https://www.npmjs.com/). And we'll need a code editor. We use [VS Code](https://code.visualstudio.com/) in this tutorial.

Some basic JavaScript, TypeScript, AWS, or React knowledge would help, but it's not necessary.

### Configure AWS credentials

You also need to have an AWS account and AWS credentials configured locally. If you haven't already, [follow these steps](../advanced/iam-credentials.md#loading-from-a-file) to set them up.

### Create a new app

<ChangeText>

Let's create our starter. We'll be using the [`create sst`](../packages/create-sst.md) CLI.

</ChangeText>


```bash
npx create-sst@latest my-sst-app
```
      
:::info
We'll be using the keyboard <img width="18" style={{ "margin": "0 4px", "vertical-align": "text-bottom" }} src="/img/components/keyboard.svg" /> icon when we want you to type in some changes.
:::

This will prompt you to select a database; either PostgreSQL or DynamoDB. Pick the one you are more familiar with.

```bash
? Select a database (you can change this later or use both) (Use arrow keys)
❯ RDS (Postgres or MySQL) 
  DynamoDB
```

You can always change this later, or even use both. We'll talk about both these options in the [Database Options](database-options.md) chapter.

<ChangeText>

Next, install the dependencies.

</ChangeText>

```bash
cd my-sst-app
npm install
```

The `create sst` CLI by default bootstraps the full-stack starter that we'll be using in this tutorial. It can also create a more minimal setup, if you pass in `--minimal`.

### Start Live Lambda Dev

<ChangeText>

And let's start the local development environment or what SST calls the [Live Lambda Dev](../live-lambda-development.md).

</ChangeText>

```bash
npx sst start
```

The first time the SST command is run, you'll be prompted to enter a default stage name to use. The stage name will be stored locally in a `.sst/` directory; that's automatically ignored from Git.

``` bash
Look like you’re running sst for the first time in this directory. Please enter
a stage name you’d like to use locally. Or hit enter to use the one based on
your AWS credentials (frank):
```

SST will automatically suggest a stage name based on the AWS credentials you are using. You can hit _Enter_ to use the suggested one.

Or if you are picking your own, make sure to use a stage name that is specific to you. SST uses the stage names to namespace your resources. So, if you are sharing an AWS account with another team member, using the same stage name can be a problem.

:::tip
SST uses the stage names to namespace your resources.
:::

You can read more about stage names and the best practices when working with your team [here](../working-with-your-team.md).

The `sst start` command, as you might've guessed, deploys to your AWS account. It does a couple of interesting things:

1. Deploys the infrastructure to run the Live Lambda Dev environment.
2. Deploys your app to AWS.
3. Runs a local server to:
   1. Proxy Lambda requests to your local machine.
   2. Power the [SST Console](../console.md).

:::info
The `sst start` command starts up the [Live Lambda Dev](../live-lambda-development.md) environment.
:::

The first time you run `sst start` it can take around 5-10 minutes. While we wait, let's take a look at the [project structure](project-structure.md) of an SST app and get our editor set up.

And don't worry, we'll look at how the local dev environment and Console works in the coming chapters.
