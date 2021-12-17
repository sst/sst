---
title: Source Maps 🟢
description: "Generating source maps for Lambda functions"
---

For Lambda functions with Node.js runtimes, SST will automatically generate source maps. The source maps are not used by default as it affects the startup time for the functions.

## Enabling source maps

You can enable the source maps by setting the NODE_OPTIONS environment variable.

```js
new Function(this, "MyFunction", {
  handler: "src/lambda.main",
  environment: {
    NODE_OPTIONS: "--enable-source-maps",
  },
});
```

You can also enable source maps for all functions in your app.

```js title="stacks/index.js"
export default function main(app) {
  app.setDefaultFunctionProps({
    environment: {
      NODE_OPTIONS: "--enable-source-maps",
    },
  });

  // Add stacks
}
```
