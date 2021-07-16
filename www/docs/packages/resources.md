---
title: "@serverless-stack/resources"
description: "Docs for the @serverless-stack/resources package"
---

The [`@serverless-stack/resources`](https://www.npmjs.com/package/@serverless-stack/resources) package provides a set of additional CDK constructs necessary to build an SST app.

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

These either extend or replace the native CDK constructs.

- [`App`](../constructs/App.md)
- [`Stack`](../constructs/Stack.md)
- [`Function`](../constructs/Function.md)

### Higher-Level Constructs

These are higher level abstractions that wrap around multiple constructs to serve specific use cases.

- [`Api`](../constructs/Api.md)
- [`Auth`](../constructs/Auth.md)
- [`Cron`](../constructs/Cron.md)
- [`Table`](../constructs/Table.md)
- [`Topic`](../constructs/Topic.md)
- [`Queue`](../constructs/Queue.md)
- _And many more!_
