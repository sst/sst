# SST 2.0 Preview

This is a preview of the upcoming SST 2.0. It is incomplete so if you run into any issues please report to us in the #cli channel in discord ASAP so we can get it fixed. We're in the final phases now and are trying to prioritize fixing blocking issues.

!!! DO NOT USE FOR PRODUCTION !!!

## Migration Guide

- SST is now a monopackage. Remove all packages referencing `@serverless-stack/*`.
- Install the `sst` package - hell yeah we got this name
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

- A temporary thing we need to do right now is to update your root `tsconfig.json` with this setting
```
  "compilerOptions": {
    "moduleResolution": "nodenext"
  }
```
A side effect of this is all imports in your stack code will need to end with `.js` - this is the future of nodejs so it is worth doing now.
- In your stacks code replace all imports from `@serverless-stack/resources` to `sst/constructs`
- We've made changes to the `FunctionProps` API so you should be seeing type errors around the `bundle` property. Most of the options there have been moved to a `nodejs` property instead
- The new CLI is temporarily named `sst2`
- Enjoy maybe?


## Not yet supported

- Any runtime other than nodejs
- SST Console

Tell us about anything else that's missing outside of this!
