---
title: Constructs
sidebar_label: Overview
description: "Import from sst/constructs to add a construct to your app."
---

import config from "../../config";
import TabItem from "@theme/TabItem";
import HeadlineText from "@site/src/components/HeadlineText";
import MultiPackagerCode from "@site/src/components/MultiPackagerCode";

<HeadlineText>

Import from `sst/constructs` to add a construct to your app.

</HeadlineText>

Use the constructs to add any feature to your app. Like a frontend, database, API, cron job, etc.

---

## About

A Construct is a TypeScript or JavaScript class, and each class corresponds to a feature of your app.

SST's constructs are built on top of [AWS CDK](https://aws.amazon.com/cdk/). They are designed to address specific use cases and have sensible defaults that make it easier to use AWS.

However, you can configure these defaults. You can even use CDK constructs in your SST app. To learn more [read about our design principles](../design-principles.md#progressive-disclosure).

---

## Installation

The constructs are available through the [`sst`](https://www.npmjs.com/package/sst) npm package.

<MultiPackagerCode>
<TabItem value="npm">

```bash
npm install sst --save-exact
```

</TabItem>
<TabItem value="yarn">

```bash
yarn add sst --exact
```

</TabItem>
<TabItem value="pnpm">

```bash
pnpm add sst --save-exact
```

</TabItem>
</MultiPackagerCode>

If you are using our starters, the `sst` package should already be installed.

---

## Usage

You can then import the constructs through `sst/constructs`.

```ts
import { Api } from "sst/constructs";
```

And then add that feature by creating a new instance in your stacks.

```ts
new Api(stack, "Api", {
  routes: {
    "GET /notes": "src/list.main",
  },
});
```

---

## Types of constructs

Check out the sidebar on the left for the different kinds of constructs that SST has. Including:

- **Core**: Used by every SST app.
- **Frontend**: Deploys a frontend to AWS.
- **Database**: Add a serverless database to your app.
- **API**: Add a dedicated API to your app.
- **Async**: This includes async features like cron jobs, long running jobs, queues, etc.
- **S3 buckets**, and more.
