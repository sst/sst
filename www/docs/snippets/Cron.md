---
description: "Snippets for the sst.Cron construct"
---

## Using the rate expression

```js
import { Cron } from "@serverless-stack/resources";

new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
```

## Using the cron expression

```js
new Cron(this, "Cron", {
  schedule: "cron(15 10 * * ? *)",
  job: "src/lambda.main",
});
```

## Using Duration

```js
import { Duration } from "aws-cdk-lib";

new Cron(this, "Cron", {
  schedule: Duration.days(1),
  job: "src/lambda.main",
});
```

## Using CronOptions

```js
new Cron(this, "Cron", {
  schedule: { minute: "0", hour: "4" },
  job: "src/lambda.main",
});
```

## Giving the cron job some permissions

Allow the function to access S3.

```js {6}
const cron = new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});

cron.attachPermissions(["s3"]);
```

## Configuring the job

Configure the internally created CDK `Event Target`.

```js {7-11}
import { RuleTargetInput } from "aws-cdk-lib/aws-events";

new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: {
    function: "src/lambda.main",
    jobProps: {
      event: RuleTargetInput.fromObject({
        key: "value"
      }),
    },
  },
});
```
