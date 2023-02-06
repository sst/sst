---
title: Cron Jobs
description: "Learn how to create cron jobs in your SST app."
---

SST can help you schedule Lambda functions to run at specified time intervals. To do this you can use the [`Cron`](constructs/Cron.md) construct.

:::tip Example

Follow this tutorial on creating a simple serverless cron job in SST.

[READ TUTORIAL](https://sst.dev/examples/how-to-use-cron-jobs-in-your-serverless-app.html)

:::

There are two ways to specify the schedule in the construct.

## Rate expressions

You can specify a rate at which a function runs. For example, every 5 minutes.

```js {4}
import { Cron } from "sst/constructs";

new Cron(stack, "Cron", {
  schedule: "rate(5 minutes)",
  job: "src/lambda.main",
});
```

:::note

The fastest rate a cron job can be run is every minute.

:::

Here are some sample rate expressions:

- `rate(1 minute)`
- `rate(5 minutes)`
- `rate(1 hour)`
- `rate(12 hours)`
- `rate(1 day)`
- `rate(7 days)`

If the value is equal to 1, then the unit must be singular. If the value is greater than 1, the unit must be plural.

## Cron expressions

Alternatively, you can specify a cron expression to have a function run at specific times, ie. every day at 12:00pm.

```js {4}
import { Cron } from "sst/constructs";

new Cron(stack, "Cron", {
  schedule: "cron(0 12 * * ? *)",
  job: "src/lambda.main",
});
```

:::note

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

You can [read more about the cron expressions syntax](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions) over on the AWS docs.
