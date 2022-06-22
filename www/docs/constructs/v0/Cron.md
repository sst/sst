---
description: "Docs for the sst.Cron construct in the @serverless-stack/resources package. This construct creates a CDK event rule."
---

:::caution
This is the SST v0.x Constructs doc. SST v1 is now released. If you are using v1, see the [v1 Constructs doc](/constructs). If you are looking to upgrade to v1, [check out the migration steps](/constructs/v0/migration).
:::

The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job. You can create a cron job by handler function and specifying the schedule it needs to run on. Internally this construct uses a [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).

## Initializer

```ts
new Cron(scope: Construct, id: string, props: CronProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`CronProps`](#cronprops)

## Examples

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
import { Duration } from "aws-cdk-lib";

new Cron(this, "Cron", {
  schedule: Duration.days(1),
  job: "src/lambda.main",
});
```

### Using CronOptions

```js
new Cron(this, "Cron", {
  schedule: { minute: "0", hour: "4" },
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

### Configuring the job

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

## Properties

An instance of `Cron` contains the following properties.

### eventsRule

_Type_ : [`cdk.aws-events.Rule`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html)

The internally created CDK EventBridge `Rule` instance.

### jobFunction

_Type_ : [`Function`](Function.md)

The internally created `Function` instance that'll be run on schedule.

## Methods

An instance of `Queue` contains the following methods.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](./Permissions)

Attaches the given list of [permissions](./Permissions) to the `jobFunction`. This allows the function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## CronProps

### job

_Type_ : `FunctionDefinition | CronJobProps`, _defaults to_ `undefined`

Takes [`FunctionDefinition`](Function.md#functiondefinition) or [`CronJobProps`](#cronjobprops) object used to create the function for the cron job.

### schedule?

_Type_ : `string | cdk.Duration | cdk.aws-events.CronOptions`

The schedule for the cron job. Can be specified as a string. The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).

```
"rate(_Value Unit_)"

// For example, every 5 minutes
"rate(5 minutes)"
```

Or as a [cron expression](https://en.wikipedia.org/wiki/Cron#CRON_expression).

```
"cron(Minutes Hours Day-of-month Month Day-of-week Year)"

// For example, 10:15 AM (UTC) every day
"cron(15 10 * * ? *)"
```

You can also use the [`cdk.Duration`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html) as an alternative to defining the rate expression.

```txt {6}
import { Duration } from "aws-cdk-lib";

// Repeat every 5 minutes

// As cdk.Duration
Duration.minutes(5)

// The equivalent rate expression
"rate(5 minutes)"
```

Similarly, you can specify the cron expression using [`cdk.aws-events.CronOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.CronOptions.html).

```txt {4}
// 10:15 AM (UTC) every day

// As cdk.aws-events.CronOptions
{ minute: "15", hour: "10" }

// The equivalent cron expression
"cron(15 10 * * ? *)"
```

### eventsRule?

_Type_ : [`cdk.aws-events.RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.RuleProps.html), _defaults to_ `undefined`

Or optionally pass in a CDK EventBridge `RuleProps`. This allows you to override the default settings this construct uses internally to create the events rule.

## CronJobProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the job function for the cron.

### jobProps?

_Type_ : [`cdk.aws-events-targets.LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunctionProps.html), _defaults to_ `undefined`

Or optionally pass in a CDK `LambdaFunctionProps`. This allows you to override the default settings this construct uses internally to create the job.
