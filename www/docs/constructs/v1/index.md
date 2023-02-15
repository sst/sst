---
title: v1 Constructs
description: "Docs for the constructs in the @serverless-stack/resources package"
slug: /constructs/v1
---

:::caution
This is the SST v1.x Constructs doc. SST v2 is now released. If you are using v2, see the [v2 Constructs doc](/constructs). If you are looking to upgrade to v2, [check out the upgrade steps](/upgrade-guide#upgrade-to-v20).
:::

import config from "../../../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Constructs are the basic building blocks of SST apps.

</HeadlineText>

---

They allow you to define the infrastructure of your app. Each construct bring together multiple AWS resources to make up a functional unit.

<details>
<summary>Behind the scenes</summary>

SST's constructs are built on top of [AWS CDK](https://aws.amazon.com/cdk/). They are designed to address specific use cases and have sensible defaults that make it easier to use AWS.

However, you can configure these defaults. You can even use CDK constructs in your SST app. Read more about the [design principles](../../design-principles.md#progressive-disclosure) we use to build our constructs.

</details>

The [`@serverless-stack/resources`](https://www.npmjs.com/package/@serverless-stack/resources) package provides a set of additional CDK constructs necessary to build an SST app.

---

## Installation

This package is usually installed together with `@serverless-stack/cli`.

```bash
# With npm
npm install @serverless-stack/cli @serverless-stack/resources --save-exact
# Or with Yarn
yarn add @serverless-stack/cli @serverless-stack/resources --exact
```

Note that, the version of these packages should be kept in sync.

---

## Importing constructs

You can either import specific constructs in your app.

```js
import { Api } from "@serverless-stack/resources";
```

Or import them all.

```js
import * as sst from "@serverless-stack/resources";
```

---

## Type of constructs

SST comes with a two types of constructs.

### Low-level

These either extend or replace the native CDK constructs.

- [`App`](./App.md)
- [`Stack`](./Stack.md)
- [`Function`](./Function.md)

### Higher-level

These are higher level abstractions that wrap around multiple constructs to serve specific use cases.

- [`Api`](./Api.md)
- [`Auth`](./Auth.md)
- [`Cron`](./Cron.md)
- [`Table`](./Table.md)
- [`Topic`](./Topic.md)
- [`Queue`](./Queue.md)
- _And many more!_
