---
description: "Docs for the sst.EventBus construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `EventBus` construct is a higher level CDK construct that makes it easy to create an [EventBridge Event Bus](https://aws.amazon.com/eventbridge/). You can create a bus that has a list of rules and targets. And you can publish messages to it from any part of your serverless app.

You can have two types of targets; Function targets (with a Lambda function) or Queue targets (with an SQS queue). See the [examples](#examples) for more details.


## Constructor
```ts
new EventBus(scope: Construct, id: string, props: EventBusProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`EventBusProps`](#eventbusprops)

## Examples


### Using the minimal config

```js
import { EventBus } from "@serverless-stack/resources";

new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

Note that, `rule1` here is simply a key to identify the rule.

## Properties
An instance of `EventBus` has the following properties.

### cdk.eventBus

_Type_ : [`IEventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IEventBus.html)

The internally created CDK `EventBus` instance.


### eventBusArn

_Type_ : `string`

The ARN of the internally created CDK `EventBus` instance.

### eventBusName

_Type_ : `string`

The name of the internally created CDK `EventBus` instance.

## Methods
An instance of `EventBus` has the following methods.
### addRules

```ts
addRules(scope: Construct, rules: Record)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __rules__ Record<`string`, [`EventBusRuleProps`](#eventbusruleprops)>


Add rules after the EventBus has been created.

#### Examples

```js
bus.addRules(this, {
  rule2: {
    eventPattern: { source: ["myevent"] },
    targets: ["src/target3.main", "src/target4.main"],
  },
});
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Add permissions to all event targets in this EventBus.

#### Examples

```js {10}
bus.attachPermissions(["s3"]);
```

### attachPermissionsToTarget

```ts
attachPermissionsToTarget(ruleKey: string, targetIndex: number, permissions: Permissions)
```
_Parameters_
- __ruleKey__ `string`
- __targetIndex__ `number`
- __permissions__ [`Permissions`](Permissions)


Add permissions to a specific event bus rule target

#### Examples

```js {10}
const bus = new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});

bus.attachPermissionsToTarget("rule1", 0, ["s3"]);
```

## EventBusProps



### cdk.eventBus?

_Type_ : [`IEventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IEventBus.html)&nbsp; | &nbsp;[`EventBusProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.EventBusProps.html)

Override the internally created EventBus

#### Examples

```js
new EventBus(this, "Bus", {
  cdk: {
    eventBus: {
      eventBusName: "MyEventBus",
    },
  }
});
```



### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the EventBus. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples

```js
new EventBus(props.stack, "Bus", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```


### rules?

_Type_ : Record<`string`, [`EventBusRuleProps`](#eventbusruleprops)>

The rules for the eventbus

#### Examples

```js {5}
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: ["src/target1.main"],
    },
  },
});
```

## EventBusRuleProps
Used to configure an EventBus rule


### cdk.rule?

_Type_ : Omit<[`RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RuleProps.html), `"eventBus"`&nbsp; | &nbsp;`"targets"`>

Configure the internally created CDK `Rule` instance.

#### Examples

```js {4}
new EventBus(this, "Bus", {
  DOCTODO
});
```






Fields to match on the detail field

#### Examples

```js
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      pattern: { detail: { FOO: 1 }  },
    },
  },
});
```

### pattern.detailType?

_Type_ : Array< `string` >

A list of detailTypes to filter on

#### Examples

```js
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      pattern: { detailTypes: ["foo"]  },
    },
  },
});
```

### pattern.source?

_Type_ : Array< `string` >

A list of sources to filter on

#### Examples

```js
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
    },
  },
});
```


### targets?

_Type_ : Array< [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`EventBusFunctionTargetProps`](#eventbusfunctiontargetprops)&nbsp; | &nbsp;[`EventBusQueueTargetProps`](#eventbusqueuetargetprops) >

Configure targets for this rule. Can be a function or queue

#### Examples

```js
new EventBus(props.stack, "Bus", {
  rules: {
    rule1: {
      targets: [
        "src/function.handler",
        new Queue(props.stack, "MyQueue"),
      ]
    },
  },
});
```

## EventBusQueueTargetProps



### cdk.target?

_Type_ : [`SqsQueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsQueueProps.html)


### queue

_Type_ : [`Queue`](Queue)

The queue to trigger

#### Examples

```js
new EventBus(props.stack, "Bus", {
  rules: {
    rule1: {
      targets: [
        { queue: new sst.Queue(props.stack, "Queue") },
      ]
    },
  },
});
```

## EventBusFunctionTargetProps
Used to configure an EventBus function target


### cdk.target?

_Type_ : [`LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaFunctionProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

The function to trigger

#### Examples

```js
new EventBus(props.stack, "Bus", {
  rules: {
    rule1: {
      targets: [
        { function: "src/function.handler" },
      ]
    },
  },
});
```
