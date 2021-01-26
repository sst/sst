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

## Importing Constructs

You can either import specific constructs in your app.

```js
import { Api } from "@serverless-stack/resources";
```

Or import them all.

```js
import * as sst from "@serverless-stack/resources";
```

## SST Constructs

SST comes with a two types of constructs.

### Low-Level Constructs

- [`App`](../constructs/app.md)
- [`Stack`](../constructs/stack.md)
- [`Function`](../constructs/function.md)

### Higher-Level Constructs

- [`Api`](../constructs/api.md)
- More coming soon!
