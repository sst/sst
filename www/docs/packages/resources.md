---
id: resources
title: "@serverless-stack/resources"
description: "Docs for the @serverless-stack/resources package"
---

The `@serverless-stack/resources` package provides the CDK constructs necessary to build an SST app.

## Installation

This package is usually installed together with [`@serverless-stack/cli`](cli.md).

```bash
# With npm
npm install @serverless-stack/cli @serverless-stack/resources --save-exact
# Or with Yarn
yarn add @serverless-stack/cli @serverless-stack/resources --exact
```

Note that, the version of these packages should be kept in sync.

## Constructs

- [`sst.App`](../constructs/app.md)
- [`sst.Api`](../constructs/api.md)
- [`sst.Stack`](../constructs/stack.md)
- [`sst.Function`](../constructs/function.md)
