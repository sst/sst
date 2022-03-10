---
description: "Docs for the sst.Cron construct in the @serverless-stack/resources package"
---
The Cron construct is a higher level CDK construct that makes it easy to create a cron job.
You can create a cron job by handler function and specifying the schedule it needs to run on.
Internally this construct uses an [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).

## Constructor
```ts
new Cron(scope: Construct, id: string, props: CronProps)
```
_Parameters_
- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- id `string`
- props [`CronProps`](#cronprops)
## Examples

### Using the rate expression
```ts
import { Cron } from "@serverless-stack/resources";
new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
```


### Using the cron expression
```ts
new Cron(this, "Cron", {
  schedule: "cron(15 10 * * ? *)",
  job: "src/lambda.main",
});
```


### Using duration
```ts
import { Duration } from "aws-cdk-lib";

new Cron(this, "Cron", {
  schedule: Duration.days(1),
  job: "src/lambda.main",
});
```


### Using CronOptions
```ts
new Cron(this, "Cron", {
  schedule: { minute: "0", hour: "4" },
  job: "src/lambda.main",
});
```


### Giving the cron job some Permissions
Allow the function to access S3.
```ts {6}
const cron = new Cron(this, "Cron", {
  schedule: "rate(1 minute)",
  job: "src/lambda.main",
});
// Allow the function to access S3.
cron.attachPermissions(["s3"]);
```


### Configuring the job
Configure the internally created CDK `Event Target`.
```ts
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
An instance of `Cron` has the following properties.
### eventsRule

_Type_ : [`Rule`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Rule.html)

The internally created EventBridge Rule instance
### jobFunction

_Type_ : [`Function`](Function)

The internally created [Function](Function) instance that'll be run on schedule.
## Methods
An instance of `Cron` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- permissions [`Permissions`](Permissions)
## CronJobProps
### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

A [FunctionDefinition]{@link Function.FunctionDefinition}
object that'll be used to create the job function for the cron.
### jobProps

_Type_ : [`LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaFunctionProps.html)

Optionally pass in a CDK LambdaFunctionProps.
This allows you to override the default settings this construct uses internally to created
the job.
## CronProps
### eventsRule

_Type_ : [`RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RuleProps.html)

Optionally pass in a CDK EventBridge RuleProps.
This allows you to override the default settings this construct uses internally
to create the events rule.
### job

_Type_ : [`FunctionDefinition`](FunctionDefinition)&nbsp; | &nbsp;[`CronJobProps`](#cronjobprops)

Function to execute for the cron job
### schedule

_Type_ : `string`&nbsp; | &nbsp;[`Duration`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html)&nbsp; | &nbsp;[`CronOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CronOptions.html)

The schedule for the cron job.

The string format can take a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html)
```
"rate(_Value Unit_)"

// For example, every 5 minutes
"rate(5 minutes)"
```


Or a [cron expression](https://en.wikipedia.org/wiki/Cron#CRON_expression)
```
"cron(Minutes Hours Day-of-month Month Day-of-week Year)"

// For example, 10:15 AM (UTC) every days
"cron(15 10 * * ? *)"
```


You can also use [cdk.Duration](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Duration.html)
as an alternative to defining the rate expression
``` {6}
import { Duration } from "aws-cdk-lib";

// Repeat every 5 minutes
// As cdk.Duration
Duration.minutes(5)

// The equivalent rate expression
"rate(5 minutes)"
```


Similarly, you can specify the cron expression using cdk.aws-events.CronOptions.
