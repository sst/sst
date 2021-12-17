---
title: Tagging Resources 🟢
description: "Tagging resources in your SST app"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

Tags are informational key-value metadata that you can add to the resources in your SST app. A tag applied to a given construct also applies to all of its taggable children. You can use tags to identify and categorize resources to simplify management, in cost allocation, and for access control, as well as for any other purposes you devise.

## Tagging the app

To [add tags](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) to all the resources in your app.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/index.js" {4}
import * as cdk from "@aws-cdk/core";

export default function main(app) {
  cdk.Tags.of(app).add("my-stage", app.stage);
}
```

</TabItem>
<TabItem value="ts">

```ts title="stacks/index.ts" {5}
import * as cdk from "@aws-cdk/core";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  cdk.Tags.of(app).add("my-stage", app.stage);
}
```

</TabItem>
</MultiLanguageCode>

## Tagging the debug stack

You can [add tags](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) to the debug stack by using the `debugStack` callback method in your `stacks/index.js`.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/index.js" {7-9}
import * as cdk from "@aws-cdk/core";

export default function main(app) {
  // define your stacks here
}

export function debugStack(app, stack, props) {
  cdk.Tags.of(app).add("my-stage", props.stage);
}
```

</TabItem>
<TabItem value="ts">

```ts title="stacks/index.ts" {8-14}
import * as cdk from "@aws-cdk/core";
import * as sst from "@serverless-stack/resources";

export default function main(app: sst.App): void {
  // define your stacks here
}

export function debugStack(
  app: cdk.App,
  stack: cdk.Stack,
  props: sst.DebugStackProps
): void {
  cdk.Tags.of(app).add("my-stage", props.stage);
}
```

</TabItem>
</MultiLanguageCode>
