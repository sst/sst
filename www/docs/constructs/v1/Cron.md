---
description: "Docs for the sst.Cron construct in the @serverless-stack/resources package"
---
The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job. You can create a cron job by handler function and specifying the schedule it needs to run on. Internally this construct uses a [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).

## Constructor
```ts
new Cron(scope: Construct, id: string, props: CronProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`CronProps`](#cronprops)
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

## Properties
An instance of `Cron` has the following properties.

### cdk.rule

_Type_ : [`Rule`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Rule.html)

The internally created CDK EventBridge Rule instance.


### jobFunction

_Type_ : [`Function`](Function)

The internally created Function instance that'll be run on schedule.

## Methods
An instance of `Cron` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of [permissions](../util/Permissions.md) to the `jobFunction`. This allows the function to access other AWS resources.
Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).


## CronJobProps

### cdk.targetProps

_Type_ : [`LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaFunctionProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

A FunctionDefinition that'll be used to create the job function for the cron.

## CronProps

### cdk.cronOptions

_Type_ : [`CronOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CronOptions.html)

### cdk.rule

_Type_ : [`RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RuleProps.html)

Optionally pass in a CDK EventBridge RuleProps. This allows you to override the default settings this construct uses internally to create the events rule.


### job

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`CronJobProps`](#cronjobprops)

### schedule

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`&nbsp; | &nbsp;`rate(${string})`&nbsp; | &nbsp;`cron(${string})`

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

You can also specify a duration as an alternative to defining the rate expression.

```txt {6}
// Repeat every 5 minutes

"5 minutes"

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
