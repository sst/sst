---
id: create-new-project
title: Create a New SST project [J]
description: "Create a New SST project"
---

import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

## Setup AWS credentials

If you don't have your AWS credentials already set up locally, follow [this section](/advanced/iam-credentials#loading-from-a-file) to create your AWS credentials file.

## Create app

Create a new app from the template.

```bash
npx create-sst@latest ideal-stack my-sst-app
cd my-sst-app
```

Install dependencies.

```bash
npm i
```

Start local environment

```bash
npx sst start
```

The first time the SST command is run, you will be prompted to enter a default stage name to use. And the stage name will be stored locally in `.sst/stage`. Make sure to use one that is specific to you. In the case that you are sharing an AWS account with another members on the team, using the same stage name can cause local environment issues. You can read more about stage names and the best practices when working with your team [here](working-with-your-team).

The initial deploy can take up to 5-10 minutes to complete. While you wait, lets take a look at the [project structure](/learn/project-structure).