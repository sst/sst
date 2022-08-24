---
title: "@serverless-stack/node"
description: "Docs for the @serverless-stack/node package"
---

The (`@serverless-stack/node`) package provides helper libraries used inside the Lambda function code.

## Installation

```bash
# With npm
npm install @serverless-stack/node
# Or with Yarn
yarn add @serverless-stack/node
```

## Usage

### Config

The `Config` module helps with loading [secrets](../constructs/Secret.md) and [parameters](../constructs/Parameter.md) created in your SST app.

```ts
import { Config } from "@serverless-stack/node/config";

export const handler = async () => {
  console.log(Config.STRIPE_KEY);

  // ...
};
```

When you import `@serverless-stack/node/config`, it does two things:

- For Secrets, `Config` performs a top-level await to fetch and decrypt the secrets values from SSM ie. `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.
- For Parameters, `Config` reads the parameter values from Lambda environment variables, ie. `process.env.SST_PARAM_USER_UPDATED_TOPIC` and assigns to `Config.USER_UPDATED_TOPIC`.

Read more about how Config works in the chapter on [Environment variables](../environment-variables.md).
