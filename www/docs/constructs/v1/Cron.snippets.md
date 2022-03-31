### Using the rate expression

```js
import { Cron } from "@serverless-stack/resources";

new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
```

### Using the cron expression

```js
new Cron(this, "Cron", {
  schedule: "cron(15 10 * * ? *)",
  job: "src/lambda.main",
});
```

### Using Duration

```js
new Cron(this, "Cron", {
  schedule: "1 day",
  job: "src/lambda.main",
});
```

### Giving the cron job some permissions

Allow the function to access S3.

```js {6}
const cron = new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});

cron.attachPermissions(["s3"]);
```

### Configuring the cron options

```js {4}
new Cron(this, "Cron", {
  job: "src/lambda.main",
  cdk: {
    cronOptions: { minute: "0", hour: "4" },
  }
});
```

### Configuring the event target

Configure the internally created CDK `Event Target`.

```js {8-12}
import { RuleTargetInput } from "aws-cdk-lib/aws-events";

new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: {
    function: "src/lambda.main",
    cdk: {
      target: {
        event: RuleTargetInput.fromObject({
          key: "value"
        }),
      },
    },
  },
});
```
