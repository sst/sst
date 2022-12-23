---
title: Constructs
sidebar_label: Overview
description: "Constructs are the basic building blocks of SST apps."
---

import config from "../../config";
import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Constructs are the basic building blocks of SST apps.

</HeadlineText>

---

They allow you to define the infrastructure of your app. Each construct bring together multiple AWS resources to make up a functional unit.

<details>
<summary>Behind the scenes</summary>

SST's constructs are built on top of [AWS CDK](https://aws.amazon.com/cdk/). They are designed to address specific use cases and have sensible defaults that make it easier to use AWS.

However, you can configure these defaults. You can even use CDK constructs in your SST app. Read more about the [design principles](../design-principles.md#progressive-disclosure) we use to build our constructs.

</details>

The [`@serverless-stack/resources`](https://www.npmjs.com/package/@serverless-stack/resources) package provides a set of additional CDK constructs necessary to build an SST app.

---

## Installation

This package is usually installed together with [`@serverless-stack/cli`](../packages/sst.md).

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

- [`App`](../constructs/App.md)
- [`Stack`](../constructs/Stack.md)
- [`Function`](../constructs/Function.md)

### Higher-level

These are higher level abstractions that wrap around multiple constructs to serve specific use cases.

- [`Api`](../constructs/Api.md)
- [`Auth`](../constructs/Auth.md)
- [`Cron`](../constructs/Cron.md)
- [`Table`](../constructs/Table.md)
- [`Topic`](../constructs/Topic.md)
- [`Queue`](../constructs/Queue.md)
- _And many more!_
