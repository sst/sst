---
description: "Docs for the sst.EventBus construct in the @serverless-stack/resources package"
---

import TabItem from '@theme/TabItem';
import MultiLanguageCode from '@site/src/components/MultiLanguageCode';

The `EventBus` construct is a higher level CDK construct that makes it easy to create an EventBridge event bus. You can create a bus that has a list of rules and targets. And you can publish messages to it from any part of your serverless app.

You can have two types of targets; Function targets (with a Lambda function) or Queue targets (with a SQS queue). See the [examples](#examples) for more details.

## Initializer

```ts
new EventBus(scope: Construct, id: string, props: EventBusProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`EventBusProps`](#eventbusprops)

## Examples

The `EventBus` construct is designed to make it easy to get started it with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

### Using the minimal config

```js
import { EventBus } from "@serverless-stack/resources";

new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

### Adding rules

Add rules after the EventBus has been created.

```js
const bus = new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});

bus.addRules(this, {
  rule2: {
    eventPattern: { source: ["aws.codebuild"] },
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
    eventPattern: { source: ["aws.codebuild"] },
    targets: ["src/target1.main", "src/target2.main"],
  },
});
```

### Configuring Function targets

#### Specifying the function path

You can directly pass in the path to the function.

```js {5}
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
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
      eventPattern: { source: ["aws.codebuild"] },
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

#### Specifying function props for all targets

You can extend the minimal config, to set some function props and have them apply to all the rules.

```js {2-6}
new EventBus(this, "Bus", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
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
      eventPattern: { source: ["aws.codebuild"] },
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
new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: [
        {
          function: "src/target1.main",
          targetProps: {
            retryAttempts: 20,
          },
        },
      ],
    },
  },
});
```

#### Attaching permissions for all targets

Allow all the targets in the entire EventBus to access S3.

```js {10}
const bus = new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});

bus.attachPermissions(["s3"]);
```

#### Attaching permissions for a specific target

Allow one of the target to access S3.

```js {10}
const bus = new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});

bus.attachPermissionsToTarget("rule1", 0, ["s3"]);
```

### Configuring Queue targets

#### Specifying the Queue directly

You can directly pass in an instance of the Queue construct.

```js {7}
const myQueue = new Queue(this, "MyQueue");

new EventBus(this, "Bus", {
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
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
      eventPattern: { source: ["aws.codebuild"] },
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

### Configuring the EventBus

Configure the internally created CDK `EventBus` instance.

```js {2-4}
new EventBus(this, "Bus", {
  eventBridgeEventBus: {
    eventBusName: "MyEventBus",
  },
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
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
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

### Importing an existing EventBus

Override the internally created CDK `EventBus` instance.

```js {4}
import { EventBus } from "@aws-cdk/aws-events";

new EventBus(this, "Bus", {
  eventBridgeEventBus: EventBus.fromEventBusArn(this, "ImportedBus", eventBusArn),
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

### Sharing an EventBus across stacks

You can create the EventBus construct in one stack, and add rules in other stacks. To do this, expose the EventBus as a class property.

<MultiLanguageCode>
<TabItem value="js">

```js {7-14} title="lib/MainStack.js"
import { EventBus, Stack } from "@serverless-stack/resources";

export class MainStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.bus = new EventBus(this, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["aws.codebuild"] },
          targets: ["src/target1.main", "src/target2.main"],
        },
      },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```js {4,9-16} title="lib/MainStack.ts"
import { EventBus, App, Stack, StackProps } from "@serverless-stack/resources";

export class MainStack extends Stack {
  public readonly bus: EventBus;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    this.bus = new EventBus(this, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["aws.codebuild"] },
          targets: ["src/target1.main", "src/target2.main"],
        },
      },
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

Then pass the EventBus to a different stack. Behind the scenes, the EventBus Arn is exported as an output of the `MainStack`, and imported to `AnotherStack`.

<MultiLanguageCode>
<TabItem value="js">

```js {3} title="lib/index.js"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", { bus: mainStack.bus });
```

</TabItem>
<TabItem value="ts">

```ts {3} title="lib/index.ts"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", { bus: mainStack.bus });
```

</TabItem>
</MultiLanguageCode>

Finally, call `addRules`. Note that the AWS resources for the added routes will be created in `AnotherStack`.

<MultiLanguageCode>
<TabItem value="js">

```js title="lib/AnotherStack.js"
import { Stack } from "@serverless-stack/resources";

export class AnotherStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    props.bus.addRules(this, {
      rule2: {
        targets: ["src/target3.main", "src/target4.main"],
      },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```ts title="lib/AnotherStack.ts"
import { EventBus, App, Stack, StackProps } from "@serverless-stack/resources";

interface AnotherStackProps extends StackProps {
  readonly bus: EventBus;
}

export class AnotherStack extends Stack {
  constructor(scope: App, id: string, props: AnotherStackProps) {
    super(scope, id, props);

    props.bus.addRules(this, {
      rule2: {
        targets: ["src/target3.main", "src/target4.main"],
      },
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

## Properties

An instance of `EventBus` contains the following properties.

### eventBusArn

_Type_: `string`

The ARN of the internally created CDK `EventBus` instance.

### eventBusName

_Type_: `string`

The name of the internally created CDK `EventBus` instance.

### eventBridgeEventBus

_Type_: [`cdk.aws-events.EventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.EventBus.html)

The internally created CDK `EventBus` instance.

## Methods

An instance of `EventBus` contains the following methods.

### addRules

```ts
addRules(scope: cdk.Construct, rules: { [key: string]: EventBusCdkRuleProps })
```

_Parameters_

- **scope** `cdk.Construct`
- **rules** `{ [key: string]: EventBusCdkRuleProps }`

An associative array with the key being the rule as a string and the value is the [`EventBusCdkRuleProps`](#eventbuscdkruleprops).

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the targets in all the rules. This allows the functions to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToTarget

```ts
attachPermissionsToTarget(ruleKey: string, targetIndex: number, permissions: Permissions)
```

_Parameters_

- **ruleKey** `string`

- **targetIndex** `number`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific target of a rule. This allows that function to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## EventBusProps

### rules?

_Type_ : `{ [key: string]: EventBusCdkRuleProps }`, _defaults to_ `{}`

The rules for this EventBus. Takes an associative array, with the key being the rule as a string and the value is the [`EventBusCdkRuleProps`](#eventbuscdkruleprops).

### eventBridgeEventBus?

_Type_ : `cdk.aws-events.EventBusProps | cdk.aws-events.EventBus`

Pass in a [`cdk.aws-events.EventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.EventBus.html) value to override the default settings this construct uses to create the CDK `HttpApi` internally.

Or, pass in an instance of the CDK [`cdk.aws-events.EventBus`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.EventBus.html). SST will use the provided CDK `HttpApi` instead of creating one internally.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the API. If the `function` is specified for a route, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

## EventBusFunctionTargetProps

### function

_Type_ : [`FunctionDefinition`](Function.md#functiondefinition)

The function definition used to create the function for this target.

### targetProps?

_Type_ : [`cdk.aws-events-targets.LambdaFunctionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events-targets.LambdaFunctionProps.html), _defaults to_ `undefined`

Or optionally pass in a CDK `LambdaFunctionProps`. This allows you to override the default settings this construct uses internally to create the target.

## EventBusQueueTargetProps

### queue

_Type_ : `Queue`

The [`Queue`](Queue.md) construct that'll be added as a target to the bus.

### targetProps?

_Type_ : [`cdk.aws-events-targets.SqsQueueProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events-targets.SqsQueueProps.html), _defaults to_ `undefined`

Or optionally pass in the CDK `SqsQueueProps`. This allows you to override the default settings this construct uses internally to create the target.

## EventBusCdkRuleProps

`EventBusCdkRuleProps` extends [`cdk.aws-events.RuleProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-events.RuleProps.html) with the following exceptions.

### targets

_Type_ : `(FunctionDefinition | EventBusFunctionTargetProps | Queue | EventBusQueueTargetProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition), [`EventBusFunctionTargetProps`](#eventbusfunctiontargetprops), [`Queue`](Queue.md), or [`EventBusQueueTargetProps`](#eventbusqueuetargetprops) objects that'll be used to add the targets for the bus.

Use `FunctionDefinition` or `EventBusFunctionTargetProps` to add a Lambda function target.

Or, use `Queue` or `EventBusQueueTargetProps` to add a Queue target.
