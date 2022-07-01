---
title: Source Maps
description: "Enabling source maps for Lambda functions in SST."
---

For Lambda functions with Node.js runtimes, SST will automatically generate source maps. The source maps are not used by default as it affects the startup time for Lambda functions.

You can enable the use of source maps by setting `--enable-source-maps` in the `NODE_OPTIONS` environment variable.

```js {4}
new Function(stack, "MyFunction", {
  handler: "src/lambda.main",
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
  bundle: {
    sourcemap: true
  },
});
```

Alternatively, you can also enable source maps for all the functions in your app.

```js title="stacks/index.js" {4}
export default function main(app) {
  app.setDefaultFunctionProps({
    environment: {
      NODE_OPTIONS: "--enable-source-maps",
    },
    bundle: {
      sourcemap: true
    },
  });

  // Add stacks
}
```
