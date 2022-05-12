### Rate schedule

```js
import { Cron } from "@serverless-stack/resources";

new Cron(stack, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
```

### Cron schedule

```js
new Cron(stack, "Cron", {
  schedule: "cron(15 10 * * ? *)",
  job: "src/lambda.main",
});
```

### Permissions

Allow the function to access S3.

```js {6}
const cron = new Cron(stack, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});

cron.attachPermissions(["s3"]);
```

### Advanced examples

#### Configuring the event rule

Configure the internally created EventBus Rule.

```js {7}
import { Schedule } from "aws-cdk-lib/aws-events";

new Cron(stack, "Cron", {
  job: "src/lambda.main",
  cdk: {
    rule: {
      schedule: Schedule.cron({ minute: "0", hour: "4" }),
    }
  }
});
```

#### Configuring the event target

Configure the internally created EventBus Target.

```js {8-12}
import { RuleTargetInput } from "aws-cdk-lib/aws-events";

new Cron(stack, "Cron", {
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
