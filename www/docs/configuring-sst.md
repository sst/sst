---
title: Configuring SST
description: "Configuring an SST application"
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>
  SST is configured using a typescript configuration file
</HeadlineText>

---

### File Structure

The `sst.config.ts` file is placed at the root of your application, typically in the top most directory of your repository.

While it is defined as a typescript file, it should **not** be treated as a subpackage in a monorepo setup. It is a root level config used for managing your entire application.

### Basic Config

Example of a minimal config

```js
import type { SSTConfig } from "sst"

export default {
  config(input) {
    return {
      name: "myapp",
      region: "us-east-1",
    }
  },
  stacks(app) {
  },
} satisfies SSTConfig
```

The `SSTConfig` type provides typesafety for the configuration object.

### Config function

The config function receives a global input object - this may contain any settings the user passes through cli flags.

These may include

- **`region`** - AWS region to use
- **`profile`** - AWS profile to use
- **`role`** - AWS role to assume for calls to AWS
- **`stage`** - Stage to use

These fields will only have values if the user explicitly passes them through `--` flags

You can use these flags to implement any kind of logic to before returning a configuration. For example you can use a different profile based on what stage is being used.

```js
config(input) {
  return {
    name: "myapp",
    region: input.stage === "production"
      ? "myapp-production"
      : "myapp-dev"
  }
},
```

Full set of config options that can be returned

- **`name`** - The name of your application
- **`stage`** - The stage to use (won't have effect if CLI flag is specified)
- **`region`** - AWS region to use (won't have effect if CLI flag is specified)
- **`profile`** - AWS profile to use (won't have effect if CLI flag is specified)
- **`role`** - AWS role to use (won't have effect if CLI flag is specified)
- **`ssmPrefix`** - SSM prefix for all SSM parameters that SST creates

### Stacks function

The stacks function is the entry point for you SST application. This is where you can specify stacks that contain the resources that you want to deploy.

```js
import { Bucket } from "sst/constructs"

stacks(app) {
  app.stack(function MyStack({ stack } ) {
    new Bucket(stack, "public")
  })
}
```

You can define stacks inline like above or you can organize them as seperate files.

```js
import { MyStack } from "./stacks/my-stack"
import { MyOtherStack } from "./stacks/my-other-stack"

stacks(app) {
  app
    .stack(MyStack)
    .stack(MyOtherStack)
}
```
