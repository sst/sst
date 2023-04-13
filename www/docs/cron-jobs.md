---
title: Cron Jobs
description: "Add a cron job to your SST app."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

Add a cron job to your SST app.

</HeadlineText>

---

## Overview

SST makes it very easy to add serverless cron jobs to your app.

1. Add a construct and define the schedule
2. Create the function that'll get run

Let's look at how to do this in detail.

---

#### Get started

Start by creating a new SST + Next.js app by running the following command in your terminal. We are using Next.js for this example but you can use your favorite frontend.

```bash
npx create-sst@latest --template standard/nextjs
```

---

## Add the construct

Add the construct to your stacks.

```ts title="stacks/Default.ts"
new Cron(stack, "cron", {
  schedule: "rate(1 minute)",
  job: "packages/functions/src/cron.handler",
});
```

This defines a cron job that'll run every minute and points to the function that will be invoked.

Make sure to import the [`Cron`](constructs/Bucket.md) construct.

```diff title="stacks/Default.ts"
- import { StackContext, NextjsSite } from "sst/constructs";
+ import { Cron, StackContext, NextjsSite } from "sst/constructs";
```

---

## Add the handler

Let's add the function that'll be invoked. Create a file in `packages/functions/src/cron.ts`.

```ts title="packages/functions/src/cron.ts"
export async function handler() {
  console.log("Running my cron job");
}
```

Once your app updates, you'll notice the logs being printed out every minute in your terminal.

---

And that's it! You can now add cron jobs to your app. If your function needs to run for longer than the Lambda timeout, you can trigger a [long running job](long-running-jobs.md).
