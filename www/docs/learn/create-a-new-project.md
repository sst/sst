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

Install the dependencies.

</ChangeText>

```bash
cd my-sst-app
npm i
```

<ChangeText>

Start the local environment.

</ChangeText>

```bash
npx sst start
```

The first time the SST command is run, you'll be prompted to enter a default stage name to use. The stage name will be stored locally in a `.sst/` directory. This directory is automatically ignored from Git.

Make sure to use a stage name that is specific to you. If you are sharing an AWS account with another team member, using the same stage name can cause issues locally. You can read more about stage names and the best practices when working with your team [here](../working-with-your-team.md).

The initial deploy can take around 5-10 minutes. It'll create all the infrastructure we'll need for our simple Reddit clone.

:::note
The `create sst` CLI by default bootstraps the full-stack starter that we'll be using in this tutorial. It can also create a more minimal setup, if you pass in `--minimal`.
:::

While we wait, let's take a look at the [project structure](project-structure.md) of an SST app and get our editor set up.
