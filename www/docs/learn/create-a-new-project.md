---
title: Create a New Project
---

### Setup AWS credentials

If you haven't already, [follow these steps](../advanced/iam-credentials.md#loading-from-a-file) to configure your AWS credentials locally.

### Create a new app

Create a new app using our [`create sst`](../packages/create-sst.md) starter. 

```bash
npx create-sst@latest ideal-stack my-sst-app
cd my-sst-app
```

Install the dependencies.

```bash
npm i
```

Start the local environment.

```bash
npm start
```

The initial deploy can take up to 5-10 minutes to complete. While we wait, let's take a look at the [project structure](/learn/project-structure.md) of an SST app and get our local development environment set up.
