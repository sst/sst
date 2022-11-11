# SST 2.0 Preview

This is a preview of the upcoming SST 2.0. It is incomplete so if you run into any issues please report to us in the discord ASAP so we can get it fixed. We're in the final phases now and are trying to prioritize fixing blocking issues.

## Migration Guide

1. SST is now a monopackage. Remove all packages referencing `@serverless-stack/*`.
2. Install the `sst` package - hell yeah we got this name
3. A temporary thing we need to do right now is to update your root `tsconfig.json` with this setting
```
  "compilerOptions": {
    "moduleResolution": "nodenext"
  }
```
A side effect of this is all imports in your stack code will need to end with `.js` - this is the future of nodejs so it is worth doing now.
4. In your stacks code replace all imports from `@serverless-stack/resources` to `sst/constructs`
5. We've made changes to the `FunctionProps` API so you should be seeing type errors around the `bundle` property. Most of the options there have been moved to a `nodejs` property instead
6. The new CLI is temporarily named `sst2`
7. Enjoy maybe?

