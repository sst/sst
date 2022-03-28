---
description: "Snippets for the sst.App construct"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

## Accessing app properties

The properties of the app can be accessed in the `stacks/index.js` as:

```js
export default function main(app) {
  app.name;
  app.stage;
  app.region;
  app.account;
}
```

## Specifying default function props

You can set some function props and have them apply to all the functions in your app. This must be called before any stack with functions have been added to the application; so that all functions will be created with these defaults.

```js title="stacks/index.js"
export default function main(app) {
  app.setDefaultFunctionProps({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: { TABLE_NAME: "NOTES_TABLE" },
  });

  // Start adding stacks
}
```

Or if you need to access the `Stack` scope, you can pass in a callback.

```js title="stacks/index.js"
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export default function main(app) {
  app.setDefaultFunctionProps((stack) => ({
    timeout: 20,
    memorySize: 512,
    runtime: "go1.x",
    environment: {
      API_KEY: StringParameter.valueFromLookup(stack, "my_api_key"),
    },
  }));

  // Start adding stacks
}
```

## Updating default function props

You can also use `addDefaultFunctionPermissions`, `addDefaultFunctionEnv`, and `addDefaultFunctionLayers` to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

However, they only affect the functions that are created after the call.

```js title="stacks/index.js"
export default function main(app) {

  new StackA(app, "stack-a");

  app.addDefaultFunctionEnv({
    TABLE_NAME: "NOTES_TABLE"
  });

  app.addDefaultFunctionPermissions(["s3"]);

  app.addDefaultFunctionLayers([mylayer]);

  new StackB(app, "stack-b");

  // Add more stacks
}
```

So in the above example, the `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` calls will only impact the functions in `StackB`.

You can also use the Stack's `setDefaultFunctionProps` to update these for a specific stack.

## Setting a default removal policy

You can set a removal policy to apply to all the resources in the app. This is useful for ephemeral environments that need to clean up all their resources on removal.

``` js title="stacks/index.js"
export default function main(app) {
  // Remove all resources when the dev stage is removed
  if (app.stage === "dev") {
    app.setDefaultRemovalPolicy("destroy");
  }

  // Add stacks
}
```

Note that, the `setDefaultRemovalPolicy` method isn't meant to be used for production environments.
