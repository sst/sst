---
description: "Docs for the sst.Cron construct in the @serverless-stack/resources package. This construct creates a CDK event rule."
---

The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job. You can create a cron job by handler function and specifying the schedule it needs to run on. Internally this construct uses a [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.Rule.html).

## Initializer

```ts
new Cron(scope: Construct, id: string, props: CronProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`CronProps`](#cronprops)

## Examples

### Using the rate expression

```js
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
  schedule: cdk.Duration.days(1),
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

### Giving the cronjob some permissions

Allow the function to access S3.

```js {6}
const cron = new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});

cron.attachPermissions(["s3"]);
```

## Properties

An instance of `Cron` contains the following properties.

### eventsRule

_Type_ : [`cdk.aws-events.Rule`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.Rule.html)

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

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to the `jobFunction`. This allows the function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## CronProps

### job

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for the cronjob.

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

You can also use the [`cdk.Duration`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.Duration.html) as an alternative to defining the rate expression.

```js {4}
// Repeat every 5 minutes

// As cdk.Duration
cdk.Duration.minutes(5);
// The equivalent rate expression
// ("rate(5 minutes)")
```

Similarly, you can specify the cron expression using [`cdk.aws-events.CronOptions`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.CronOptions.html).

```js {4}
// 10:15 AM (UTC) every day

// As cdk.aws-events.CronOptions
{ minute: "15", hour: "10" }
// The equivalent cron expression
// "cron(15 10 * * ? *)"
```

### eventsRule?

_Type_ : [`cdk.aws-events.Rule`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.Rule.html), _defaults to_ `undefined`

Or optionally pass in a CDK EventBridge `Rule` instance. This allows you to override the default settings this construct uses internally to create the events rule.
