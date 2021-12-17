---
title: Cron Job 🟢
description: "Creating cron jobs in your SST app"
---

If you want to schedule functions to run at specified times, use the [`Cron`](../constructs/Cron.md) construct. Here are some examples.

:::info Example

This tutorial steps through creating a simple serverless Cron job.

[READ TUTORIAL](https://serverless-stack.com/examples/how-to-use-cron-jobs-in-your-serverless-app.html)

:::

## Rate expressions

You can specify a rate at which a function runs, ie. every 5 minutes.

```js
import { Cron } from "@serverless-stack/resources";

new Cron(this, "Cron", {
  schedule: "rate(5 minutes)",
  job: "src/lambda.main",
});
```

:::note
If the value is equal to 1, then the unit must be singular. If the value is greater than 1, the unit must be plural.
:::

Here are some sample rate expressions.
- `rate(1 minute)`
- `rate(5 minutes)`
- `rate(1 hour)`
- `rate(12 hours)`
- `rate(1 day)`
- `rate(7 days)`

The fastest rate a function can be run is every 1 minute.

## Cron expressions

You can specify a cron expression to have a function run at specific times, ie. every day at 12:00pm.

```js
import { Cron } from "@serverless-stack/resources";

new Cron(this, "Cron", {
  schedule: "cron(0 12 * * ? *)",
  job: "src/lambda.main",
});
```

:::note
All cron expressions use UTC+0 time zone.
:::

Here are some example cron expressions.

| Minutes | Hours | Day of month | Month | Day of week | Year | Meaning | 
| --- | --- | --- | --- | --- | --- | --- | 
|  0  |  10  |  \*  |  \*  |  ?  |  \*  |  Run at 10:00 am every day  | 
|  15  |  12  |  \*  |  \*  |  ?  |  \*  |  Run at 12:15 pm every day  | 
|  0  |  18  |  ?  |  \*  |  MON\-FRI  |  \*  |  Run at 6:00 pm every Monday through Friday  | 
|  0  |  8  |  1  |  \*  |  ?  |  \*  |  Run at 8:00 am every 1st day of the month  | 
|  0/15  |  \*  |  \*  |  \*  |  ?  |  \*  |  Run every 15 minutes  | 
|  0/10  |  \*  |  ?  |  \*  |  MON\-FRI  |  \*  |  Run every 10 minutes Monday through Friday  | 
|  0/5  |  8\-17  |  ?  |  \*  |  MON\-FRI  |  \*  |  Run every 5 minutes Monday through Friday between 8:00 am and 5:55 pm  | 
|  0/30  |  20\-2  |  ?  |  \*  |  MON\-FRI  |  \*  |  Run every 30 minutes Monday through Friday between 10:00 pm on the starting day to 2:00 am on the following day  | 

Read more about cron expressions syntax here: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions
