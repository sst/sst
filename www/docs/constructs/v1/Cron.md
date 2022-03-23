---
description: "Docs for the sst.Cron construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Cron` construct is a higher level CDK construct that makes it easy to create a cron job. You can create a cron job by handler function and specifying the schedule it needs to run on. Internally this construct uses a [EventBridge Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html).

## Constructor
```ts
new Cron(scope: Construct, id: string, props: CronProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`CronProps`](#cronprops)
## Properties
An instance of `Cron` has the following properties.
### jobFunction

_Type_ : [`Function`](Function)

The internally created Function instance that'll be run on schedule.


### cdk.rule

_Type_ : [`Rule`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Rule.html)

The internally created CDK EventBridge Rule instance.


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


## CronProps


### job

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`CronJobProps`](#cronjobprops)

The definition of the function to be executed

#### Examples

```js
new Cron(this, "Cron", {
  function : "src/function.handler",
})
```

### schedule?

_Type_ : `${number} second`&nbsp; | &nbsp;`${number} seconds`&nbsp; | &nbsp;`${number} minute`&nbsp; | &nbsp;`${number} minutes`&nbsp; | &nbsp;`${number} hour`&nbsp; | &nbsp;`${number} hours`&nbsp; | &nbsp;`${number} day`&nbsp; | &nbsp;`${number} days`&nbsp; | &nbsp;`rate(${string})`&nbsp; | &nbsp;`cron(${string})`

The schedule for the cron job. The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).
```
"rate(_Value Unit_)"

// For example, every 5 minutes
"rate(5 minutes)"
```

```
"cron(Minutes Hours Day-of-month Month Day-of-week Year)"

// For example, 10:15 AM (UTC) every day
"cron(15 10 * * ? *)"
```

```txt
// Repeat every 5 minutes

"5 minutes"

// The equivalent rate expression
"rate(5 minutes)"
```

```txt
// 10:15 AM (UTC) every day

// As cdk.aws-events.CronOptions
{ minute: "15", hour: "10" }

// The equivalent cron expression
"cron(15 10 * * ? *)"
```

#### Examples

```js
import { Cron } from "@serverless-stack/resources";

new Cron(this, "Cron", {
  job: "src/lambda.main",
  schedule: "rate(1 minute)",
});
```

```js
new Cron(this, "Cron", {
  job: "src/lambda.main",
  schedule: "cron(15 10 * * ? *)",
});
```


### cdk.cronOptions?

_Type_ : [`CronOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.CronOptions.html)

Override the internally created cron expression.

### cdk.rule?

_Type_ : [`RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RuleProps.html)

Override the default settings this construct uses internally to create the events rule.


## CronJobProps


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function that will be executed when the job runs.

#### Examples

```js
  new Cron(this, "Cron", {
    job: {
      function: "src/lambda.main",
    },
  });
```


### cdk.target?

_Type_ : [`LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaFunctionProps.html)

Override the default settings this construct uses internally to create the events rule.

