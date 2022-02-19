---
title: Tagging Resources
description: "Learn how to tag resources in your Serverless Stack (SST) app."
---

[Tags](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) are key-value metadata that you can add to the resources in your SST app. A tag applied to a given construct and also applies to all of its taggable children. You can use tags to identify and categorize resources to simplify management, control costs, and for access control.

Let's look at how to add tags.

## Tagging the app

To add tags to all the resources in your app.

```js title="stacks/index.js" {4}
import * as cdk from "@aws-cdk/core";

export default function main(app) {
  cdk.Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);
}
```

## Tagging the debug stack

You can also add tags to the debug stack that SST deploys for the [Live Lambda Dev](../live-lambda-development.md) environment.

To do that use the `debugApp` callback method in your `stacks/index.js`.

```js title="stacks/index.js" {8-11}
import * as cdk from "@aws-cdk/core";
import * as sst from "@serverless-stack/resources";

export default function main(app) {
  // Define your stacks here
}

export function debugApp(app) {
  new sst.DebugStack(app, "debug-stack");
  cdk.Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);
}
```

:::note
You are responsible for creating the `DebugStack` inside the debugApp callback.
```js
  new sst.DebugStack(app, "debug-stack");
```
:::
