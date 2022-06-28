---
title: Create a New Project
---

### Setup AWS credentials

If you haven't already, [follow these steps](../advanced/iam-credentials.md#loading-from-a-file) to configure your AWS credentials locally.

### Create a new app

Create a new app using our [`create sst`](../packages/create-sst.md) starter. 

```bash
npx create-sst@latest my-sst-app
```

This will prompt you to select a database. You can change this later (or use both) and if you want to learn more about the two options check out the [Database Options](database-options.md) chapter.

This learn guide is built around a full-stack starter with a GraphQL API. If you'd like to use a more minimal setup you can pass in `--minimal` to the `create-sst` command.

Install the dependencies.

```bash
cd my-sst-app
npm i
```

Start the local environment.

```bash
npx sst start
```

The first time the SST command is run, you'll be prompted to enter a default stage name to use. The stage name will be stored locally in a `.sst/` directory. This directory is automatically ignore from Git.

Make sure to use a stage name that is specific to you. If you are sharing an AWS account with another team member, using the same stage name can cause issues locally. You can read more about stage names and the best practices when working with your team [here](../working-with-your-team.md).

The initial deploy can around 5-10 minutes. It'll create all the infrastructure we'll need for our simple Reddit clone. While we wait, let's take a look at the [project structure](project-structure.md) of an SST app and get our editor set up.
