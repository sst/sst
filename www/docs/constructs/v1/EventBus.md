---
description: "Docs for the sst.EventBus construct in the @serverless-stack/resources package"
---
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


### Adding rules

```js
const bus = new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});

bus.addRules(this, {
  rule2: {
    eventPattern: { source: ["myevent"] },
    targets: ["src/target3.main", "src/target4.main"],
  },
});
```

### Lazily adding rules

Create an _empty_ EventBus construct and lazily add the rules.

```js {3-8}
const bus = new EventBus(this, "Bus");

bus.addRules(this, {
  rule1: {
    eventPattern: { source: ["myevent"] },
    targets: ["src/target1.main", "src/target2.main"],
  },
});
```


### Attaching permissions for all targets

Allow all the targets in the entire EventBus to access S3.

```js {10}
const bus = new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});

bus.attachPermissions(["s3"]);
```


### Attaching permissions for a specific target

Allow one of the targets to access S3.

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

Here we are referring to the rule using the rule key, `rule1`.


### Configuring the EventBus

Configure the internally created CDK [`EventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventBus.html) instance.

```js {2-4}
new EventBus(this, "Bus", {
  eventBridgeEventBus: {
    eventBusName: "MyEventBus",
  },
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```


### Specifying function props for all targets

You can extend the minimal config, to set some function props and have them apply to all the rules.

```js {3-7}
new EventBus(this, "Bus", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    }
  },
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```


### Configuring Function targets

#### Specifying the function path

You can directly pass in the path to the [`Function`](Function.md).

```js {5}
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main"],
    },
  },
});
```

#### Specifying function props

If you wanted to configure each Lambda function separately, you can pass in the [`EventBusFunctionTargetProps`](#eventbusfunctiontargetprops).

```js {6-13}
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: [
        {
          function: {
            srcPath: "src/",
            handler: "target1.main",
            environment: { tableName: table.tableName },
            permissions: [table],
          },
        },
      ],
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per target. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new EventBus(this, "Bus", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: [
        {
          function: {
            handler: "src/target1.main",
            timeout: 10,
            environment: { bucketName: bucket.bucketName },
            permissions: [bucket],
          },
        },
        "src/target2.main",
      ],
    },
  },
});
```

So in the above example, the `target1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Configuring the target

Configure the internally created CDK `Target`.

```js {8-10}
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';

new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: [
        {
          function: "src/target1.main",
          targetProps: {
            retryAttempts: 20,
            message: RuleTargetInput.fromEventPath('$.detail'),
          },
        },
      ],
    },
  },
});
```
In the example above, the function is invoked with the contents of the `detail` property on the event, instead of the envelope -  i.e. the original payload put onto the EventBus.

### Configuring Queue targets

#### Specifying the Queue directly

You can directly pass in a [`Queue`](Queue.md).

```js {7}
const myQueue = new Queue(this, "MyQueue");

new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: [myQueue],
    },
  },
});
```

#### Configuring the target

Configure the internally created CDK `Target`.

```js {8-10}
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: [
        {
          queue: myQueue,
          targetProps: {
            messageGroupId: "group1",
          },
        },
      ],
    },
  },
});
```


### Configuring the Rule

Configure the internally created CDK `Rule` instance.

```js {4}
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      ruleName: "MyRule",
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

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

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Add permissions to all event targets in this EventBus.

### attachPermissionsToTarget

```ts
attachPermissionsToTarget(ruleKey: string, targetIndex: number, permissions: Permissions)
```
_Parameters_
- __ruleKey__ `string`
- __targetIndex__ `number`
- __permissions__ [`Permissions`](Permissions)


Add permissions to a specific event bus rule target

## EventBusFunctionTargetProps

### cdk.target

_Type_ : [`LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaFunctionProps.html)


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

## EventBusProps

### cdk.eventBus

_Type_ : [`IEventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IEventBus.html)&nbsp; | &nbsp;[`EventBusProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.EventBusProps.html)





### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)




### rules

_Type_ : Record<`string`, [`EventBusRuleProps`](#eventbusruleprops)>



## EventBusQueueTargetProps

### cdk.target

_Type_ : [`SqsQueueProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsQueueProps.html)


### queue

_Type_ : [`Queue`](Queue)

## EventBusRuleProps

### cdk.rule

_Type_ : Omit<[`RuleProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.RuleProps.html), `"eventBus"`&nbsp; | &nbsp;`"targets"`>








### pattern.detailType

_Type_ : `string`

### pattern.source

_Type_ : `string`


### targets

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`EventBusFunctionTargetProps`](#eventbusfunctiontargetprops)&nbsp; | &nbsp;[`EventBusQueueTargetProps`](#eventbusqueuetargetprops)
