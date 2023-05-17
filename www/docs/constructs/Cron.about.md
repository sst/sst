The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job. You can create a cron job by handler function and specifying the schedule it needs to run on. Internally this construct uses a [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).

## Examples

### Rate schedule

```js
import { Cron } from "sst/constructs";

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

### Disabling

Disable the cron job from automatically running while developing.

```js {4}
new Cron(stack, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
  enabled: !app.local,
});
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
    },
  },
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
          key: "value",
        }),
      },
    },
  },
});
```
