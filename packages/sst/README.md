# SST 2.0 RC

This is a release candidate of the upcoming SST 2.0. Please report to us in the #cli channel in discord ASAP so we can get it fixed. We're in the final phases now and are trying to prioritize fixing blocking issues.

## Migration Guide

- SST is now a monopackage. Remove all packages referencing `@serverless-stack/resources` `@serverless-stack/cli` `@serverless-stack/node` and `@serverless-stack/static-site-env`.
- Install the `sst@rc` package - hell yeah we got this name
- You can now specify `sst.json` as `sst.config.mjs` file. Here's an example:

```js
const PROFILE = {
  staging: "bumi-staging",
  production: "bumi-production",
  default: "bumi-dev",
}

export default function (input) {
  return {
    name: "bumi",
    region: "us-east-1",
    main: "stacks/index.ts",
    profile: PROFILE[input.stage] || PROFILE.default,
  }
}
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
