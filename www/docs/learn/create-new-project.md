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
npm start
```

The initial deploy can take up to 5-10 minutes to complete. While you wait, lets take a look at the [project structure](/learn/project-structure).