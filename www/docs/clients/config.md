---
description: "Overview of the `config` module."
---

Overview of the `config` module in the `@serverless-stack/node` package.

```ts
import { ... } from "@serverless-stack/node/config"
```

The `config` module has the following exports. 

---

## Config

This module helps with loading [Secrets](../constructs/Secret.md) and [Parameters](../constructs/Parameter.md) created in your SST app.

```ts
import { Config } from "@serverless-stack/node/config";

console.log(Config.STRIPE_KEY);
```

When you import `@serverless-stack/node/config`, it does two things:

- For Secrets, `Config` performs a top-level await to fetch and decrypt the secrets values from SSM ie. `/sst/{appName}/{stageName}/secrets/STRIPE_KEY`. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.
- For Parameters, `Config` reads the parameter values from Lambda environment variables, ie. `process.env.SST_Parameter_value_USER_UPDATED_TOPIC` and assigns to `Config.USER_UPDATED_TOPIC`.

Read more about how Config works in the chapter on [Config](../config.md).