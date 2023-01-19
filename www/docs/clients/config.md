---
description: "Overview of the `config` module."
---

Overview of the `config` module in the `sst/node` package.

```ts
import { ... } from "sst/node/config"
```

The `config` module has the following exports.

---

## Properties

The properties let you access the resources that are bound to the function.

---

### Config

This module helps with loading [Secrets](../constructs/Secret.md) and [Parameters](../constructs/Parameter.md) created in your SST app.

```ts
import { Config } from "sst/node/config";

console.log(Config.STRIPE_KEY);
```

When you import `sst/node/config`, it does two things:

- For Secrets, `Config` performs a top-level await to fetch and decrypt the secrets values from SSM ie. `/sst/{appName}/{stageName}/Secret/STRIPE_KEY/value`. Once fetched, you can reference `Config.STRIPE_KEY` directly in your code.
- For Parameters, `Config` reads the parameter values from Lambda environment variables, ie. `process.env.SST_Parameter_value_APP_VERSION` and assigns to `Config.APP_VERSION`.

Read more about how Config works in the chapter on [Config](../config.md).
