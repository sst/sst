---
title: Tagging Resources
description: "Learn how to tag resources in your SST app."
---

[Tags](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) are key-value metadata that you can add to the resources in your SST app. A tag applied to a given construct and also applies to all of its taggable children. You can use tags to identify and categorize resources to simplify management, control costs, and for access control.

Let's look at how to add tags.

## Tagging the app

To add tags to all the resources in your app.

```js title="stacks/index.js" {4}
import { Tags } from "aws-cdk-lib";

export default function main(app) {
  Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);
}
```

## Tagging the Debug Stack

You can also add tags to the [Debug Stack](../constructs/DebugStack.md) that SST deploys for the [Live Lambda Dev](../live-lambda-development.md) environment.

To do that use the `debugApp` callback method in your `stacks/index.js`.

```js title="stacks/index.js" {8-12}
import { Tags } from "aws-cdk-lib";
import { DebugStack } from "sst/constructs";

export default function main(app) {
  // Define your stacks here
}

export function debugApp(app) {
  // Make sure to create the DebugStack when using the debugApp callback
  new DebugStack(app, "debug-stack");
  Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);
}
```

:::note
If you are using the `debugApp` callback, you'll need to make sure to create the `DebugStack` in it.
:::
