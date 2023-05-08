---
title: Tagging Resources
description: "Learn how to tag resources in your SST app."
---

[Tags](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) are key-value metadata that you can add to the resources in your SST app. A tag applied to a given construct and also applies to all of its taggable children. You can use tags to identify and categorize resources to simplify management, control costs, and for access control.

To add tags to all the resources in your app.

```js title="sst.config.ts" {11}
import { Tags } from "aws-cdk-lib";

export default {
  config() {
    // Config
  },
  async stacks(app) {
    Tags.of(app).add("my-tag", `${app.stage}-${app.region}`);

    // Add your stacks
    app.stack(/* ... */);
  },
} satisfies SSTConfig;
```
