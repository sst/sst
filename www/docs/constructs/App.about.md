import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The App construct extends cdk.App and is used internally by SST to:
- Automatically prefix stack names with the stage and app name
- Deploy the entire app using the same AWS profile and region

It is made available as the `app` in the `stacks()` callback in `sst.config.ts` of your SST app.

```ts title="sst.config.ts" {8}
export default {
  config(input) {
    return {
      name: "myapp",
      region: "us-east-1",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;
```

Since it is initialized internally, the props that are passed to App cannot be changed.

## Examples

### Accessing app properties

The properties of the app can be accessed in the `sst.config.ts` as:

```ts
stacks(app) {
  app.name;
  app.stage;
  app.region;
  app.account;
}
```

### Specifying default function props

You can also use [`addDefaultFunctionPermissions`](#adddefaultfunctionpermissions), [`addDefaultFunctionEnv`](#adddefaultfunctionenv), and [`addDefaultFunctionLayers`](#adddefaultfunctionlayers) to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

```ts title="sst.config.ts"
stacks(app) {
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

```ts title="sst.config.ts"
import { StringParameter } from "aws-cdk-lib/aws-ssm";

stacks(app) {
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

### Updating default function props

You can also use `addDefaultFunctionPermissions`, `addDefaultFunctionEnv`, and `addDefaultFunctionLayers` to progressively add more permissions, environment variables, and layers to the defaults. These can be called multiple times and from anywhere.

However, they only affect the functions that are created after the call.

```ts title="sst.config.ts"
stacks(app) {
  app.stack(StackA)

  app.addDefaultFunctionEnv({
    TABLE_NAME: "NOTES_TABLE"
  });

  app.addDefaultFunctionPermissions(["s3"]);

  app.addDefaultFunctionLayers([mylayer]);

  app.stack(StackB)

  // Add more stacks
}
```

So in the above example, the `addDefaultFunctionPermissions` and `addDefaultFunctionEnv` calls will only impact the functions in `StackB`.

You can also use the [Stack's `setDefaultFunctionProps`](Stack.md#setdefaultfunctionprops) to update these for a specific stack.

### Setting a default removal policy

You can set a removal policy to apply to all the resources in the app. This is useful for ephemeral environments that need to clean up all their resources on removal.

```ts title="sst.config.ts"
stacks(app) {
  // Remove all resources when the dev stage is removed
  if (app.stage === "dev") {
    app.setDefaultRemovalPolicy("destroy");
  }

  // Add stacks
}
```

Note that, the [`setDefaultRemovalPolicy`](#setdefaultremovalpolicy) method isn't meant to be used for production environments.
