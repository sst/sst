# SST 2.0 RC

This is a release candidate of the upcoming SST 2.0. Please report to us in the #cli channel in discord ASAP so we can get it fixed. We're in the final phases now and are trying to prioritize fixing blocking issues.

## Migration Guide

- SST is now a monopackage. Remove all packages referencing `@serverless-stack/resources` `@serverless-stack/cli` `@serverless-stack/node` and `@serverless-stack/static-site-env`.
- Install the `sst@rc` package - hell yeah we got this name
- If you don't already have it, add the `constructs@10.1.156` package
- `sst.json` is now specified as a `sst.config.ts` file. And since it's a typescript file, you do not need an additional `main` field pointing to one. Here's an example that takes advantage of the new structure.

```js
import { SSTConfig } from "sst"
import { Api } from "./stacks/Api.js"
import { Dynamo } from "./stacks/Dynamo.js"

export default {
  config(input) {
    const PROFILE: Record<string, string> = {
      staging: "myco-staging",
      production: "myco-production",
      default: "myco-dev",
    }
    return {
      name: "myapp",
      region: "us-east-1",
      profile: PROFILE[input.stage || "default"],
    }
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "nodejs16.x",
      architecture: "arm_64",
    })

    app
      .stack(Api)
      .stack(Dynamo)
  },
} satisfies SSTConfig
```

- In your stacks code replace all imports from `@serverless-stack/resources` to `sst/constructs`
- In your functions code replace all imports from `@serverless-stack/node/xxx` to `sst/node/xxx`
- We've made changes to the `FunctionProps` API so you should be seeing type errors around the `bundle` property. Most of the options there have been moved to a `nodejs` property instead
- We've removed the need for `srcPath` in function definitions but all your handler paths need to be specified relative to the root of the project.
Before
```
new Function(stack, "fn", {
  srcPath: "services",
  handler: "path/to/func.handler"
})
```
After
```
new Function(stack, "fn", {
  handler: "services/path/to/func.handler"
})
```
- If you're using function binding need to make sure `../.sst/types` is listed in the `include` array in `services/tsconfig.json`
- If you were using `@serverless-stack/static-site-env` for your frontend, it can be replaced with the `sst env <command>` command
- sst start has been renamed to sst dev (although both will work)
- If using sst context directly the import is at `sst/context`
- Enjoy maybe?

## New Projects

There is also a preview of `create-sst` You can use it by running `npx create-sst@rc`

## Not yet supported

- Dotnet and Python runtime

Tell us about anything else that's missing outside of this!
