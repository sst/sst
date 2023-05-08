<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new Cron(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[CronProps](#cronprops)</span>
## CronProps


### enabled?

_Type_ : <span class="mono">boolean</span>

_Default_ : <span class="mono">true</span>

Indicates whether the cron job is enabled.


```js
new Cron(stack, "Cron", {
  job: "src/lambda.main",
  schedule: "rate(5 minutes)",
  enabled: app.local,
})
```

### job

_Type_ : <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[CronJobProps](#cronjobprops)</span></span>

The definition of the function to be executed.


```js
new Cron(stack, "Cron", {
  job : "src/lambda.main",
  schedule: "rate(5 minutes)",
})
```

### schedule?

_Type_ : <span class='mono'><span class="mono">rate(${string})</span> | <span class="mono">cron(${string})</span></span>

The schedule for the cron job.
The string format takes a [rate expression](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudwatchevents-expressions.html).

```txt
rate(1 minute)
rate(5 minutes)
rate(1 hour)
rate(5 hours)
rate(1 day)
rate(5 days)
```
Or as a [cron expression](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions).

```txt
cron(15 10 * * ? *)    // 10:15 AM (UTC) every day.
```


```js
new Cron(stack, "Cron", {
  job: "src/lambda.main",
  schedule: "rate(5 minutes)",
});
```
```js
new Cron(stack, "Cron", {
  job: "src/lambda.main",
  schedule: "cron(15 10 * * ? *)",
});
```


### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.

### cdk.rule?

_Type_ : <span class="mono">[RuleProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.RuleProps.html)</span>

Override the default settings this construct uses internally to create the events rule.


## Properties
An instance of `Cron` has the following properties.
### id

_Type_ : <span class="mono">string</span>

### jobFunction

_Type_ : <span class="mono">[Function](Function#function)</span>

The internally created Function instance that'll be run on schedule.


### cdk.rule

_Type_ : <span class="mono">[Rule](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.Rule.html)</span>

The internally created CDK EventBridge Rule instance.


## Methods
An instance of `Cron` has the following methods.
### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to the cron job. This allows the function to access other AWS resources.



```js
cron.attachPermissions(["s3"]);
```


### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to the cron job.



```js
cron.bind([STRIPE_KEY, bucket]);
```


## CronJobProps


### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function that will be executed when the job runs.


```js
  new Cron(stack, "Cron", {
    job: {
      function: "src/lambda.main",
    },
  });
```


### cdk.target?

_Type_ : <span class="mono">[LambdaFunctionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunctionProps.html)</span>

Override the default settings this construct uses internally to create the events rule.

