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

You can also use [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions), [`addDefaultFunctionEnv`](#adddefaultfunctionenv), and [`addDefaultFunctionLayers`](#adddefaultfunctionlayers) to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

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

You can also use the [Stack's `setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) to update these for a specific stack.

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

Note that, the [`setDefaultRemovalPolicy`](#setdefaultremovalpolicy) method isn't meant to be used for production environments.

## Upgrading to v0.42.0

Prior to [v0.42.0](https://github.com/serverless-stack/serverless-stack/releases/tag/v0.42.0), there was a single `setDefaultFunctionProps` function that could be called from anywhere and overwrote some parameters and merged others. This created some confusion as it was not obvious which parameters were being merged.

In v0.42.0, `setDefaultFunctionProps` was updated so it can only be called at the beginning of your app, _before_ any stack with functions have been added. It'll throw an error if it's called after adding them.

Additionally, the two following functions were added; [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions) and [`addDefaultFunctionEnv`](#adddefaultfunctionenv). These can be called from anywhere and be used to progressively add more permissions or environment variables to your defaults.

If you were previously calling `setDefaultFunctionProps` multiple times like so:

<MultiLanguageCode>
<TabItem value="js">

```js
app.setDefaultFunctionProps({
  environment: { FOO: "bar" }
});

class MyStack extends sst.Stack {
  constructor(scope) {
    super(scope, "MyStack")

    app.setDefaultFunctionProps({
      environment: { TABLE_NAME: "mytable" }
    });
  }
}

new MyStack(app);
```

</TabItem>
<TabItem value="ts">

```ts
app.setDefaultFunctionProps({
  environment: { FOO: "bar" }
});

class MyStack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "MyStack")

    app.setDefaultFunctionProps({
      environment: { TABLE_NAME: "mytable" }
    });
  }
}

new MyStack(app);
```

</TabItem>
</MultiLanguageCode>


Change it to:

<MultiLanguageCode>
<TabItem value="js">

```js
app.setDefaultFunctionProps({
  environment: { FOO: "bar" }
});

class MyStack extends sst.Stack {
  constructor(scope) {
    super(scope, "MyStack")

    app.addDefaultFunctionEnv({ TABLE_NAME: "mytable" })
  }
}

new MyStack(app);
```

</TabItem>
<TabItem value="ts">

```ts
app.setDefaultFunctionProps({
  environment: { FOO: "bar" }
});

class MyStack extends sst.Stack {
  constructor(scope: sst.App) {
    super(scope, "MyStack")

    app.addDefaultFunctionEnv({ TABLE_NAME: "mytable" })
  }
}

new MyStack(app);
```

</TabItem>
</MultiLanguageCode>

You can also use the [Stack's `setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) to update these for a specific stack.
