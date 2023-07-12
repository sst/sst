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

:::info
The fastest rate a cron job can be run is every minute.
:::

Make sure to import the [`Cron`](constructs/Cron.md) construct.

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

## Cron schedule

There are a couple of ways to specify the schedule of a cron jon.

---

#### Rate expressions

Rate expressions are the simplest way to do it. Here are some sample rate expressions:

- `rate(1 minute)`
- `rate(5 minutes)`
- `rate(1 hour)`
- `rate(12 hours)`
- `rate(1 day)`
- `rate(7 days)`

If the value is equal to 1, then the unit must be singular. If the value is greater than 1, the unit must be plural.

---

#### Cron expressions

Alternatively, you can specify a cron expression to have it run at specific times, ie. every day at 12:00pm.

```ts
schedule: "cron(0 12 * * ? *)",
```

:::info
All cron expressions use the UTC+0 time zone.
:::

Here are some example cron expressions:

| Minutes | Hours | Day of month | Month | Day of week | Year | Description                                                                                                     |
| ------- | ----- | ------------ | ----- | ----------- | ---- | --------------------------------------------------------------------------------------------------------------- |
| 0       | 10    | \*           | \*    | ?           | \*   | Run at 10:00 am every day                                                                                       |
| 15      | 12    | \*           | \*    | ?           | \*   | Run at 12:15 pm every day                                                                                       |
| 0       | 18    | ?            | \*    | MON\-FRI    | \*   | Run at 6:00 pm every Monday through Friday                                                                      |
| 0       | 8     | 1            | \*    | ?           | \*   | Run at 8:00 am every 1st day of the month                                                                       |
| 0/15    | \*    | \*           | \*    | ?           | \*   | Run every 15 minutes                                                                                            |
| 0/10    | \*    | ?            | \*    | MON\-FRI    | \*   | Run every 10 minutes Monday through Friday                                                                      |
| 0/5     | 8\-17 | ?            | \*    | MON\-FRI    | \*   | Run every 5 minutes Monday through Friday between 8:00 am and 5:55 pm                                           |
| 0/30    | 20\-2 | ?            | \*    | MON\-FRI    | \*   | Run every 30 minutes Monday through Friday between 10:00 pm on the starting day to 2:00 am on the following day |

You can [read more about the cron expressions syntax](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions).

---

And that's it! You can now add cron jobs to your app. If your function needs to run for longer than the Lambda timeout, you can trigger a [long running job](long-running-jobs.md).
