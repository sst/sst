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
new EventBus(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[EventBusProps](#eventbusprops)</span>

## Examples


### Using the minimal config

```js
import { EventBus } from "@serverless-stack/resources";

new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/function1.handler",
        myTarget2: "src/function2.handler"
      },
    },
  },
});
```

Note that, `rule1` here is simply a key to identify the rule.


import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

### Configuring rules

#### Lazily adding rules

Add rules after the EventBus has been created.

```js
const bus = new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});

bus.addRules(this, {
  rule2: {
    pattern: { source: ["myevent"] },
    targets: {
      myTarget3: "src/target3.main",
      myTarget4: "src/target4.main",
    },
  },
});
```

#### Configuring the Rule

Configure the internally created CDK `Rule` instance.

```js {4}
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      ruleName: "MyRule",
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});
```

### Configuring Function targets

#### Adding targets

You can directly pass in the path to the [`Function`](Function.md).

```js {6}
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
      },
    },
  },
});
```

#### Specifying function props for all targets

You can extend the minimal config, to set some function props and have them apply to all the rules.

```js {3-7}
new EventBus(stack, "Bus", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});
```

#### Configuring an individual target

Configure each Lambda function separately.

```js {10-11}
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: {
          function: {
            srcPath: "src/",
            handler: "target1.main",
            environment: { tableName: table.tableName },
            permissions: [table],
          },
        },
      },
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per target. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new EventBus(stack, "Bus", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: {
          function: {
            handler: "src/target1.main",
            timeout: 10,
            environment: { bucketName: bucket.bucketName },
            permissions: [bucket],
          },
        },
        myTarget2: "src/target2.main",
      },
    },
  },
});
```

So in the above example, the `target1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Configuring the target

Configure the internally created CDK `Target`.

```js {11-14}
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';

new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: {
          function: "src/target1.main",
          cdk: {
            target: {
              retryAttempts: 20,
              message: RuleTargetInput.fromEventPath('$.detail'),
            },
          },
        },
      },
    },
  },
});
```
In the example above, the function is invoked with the contents of the `detail` property on the event, instead of the envelope -  i.e. the original payload put onto the EventBus.

#### Attaching permissions for all targets

Allow all the targets in the entire EventBus to access S3.

```js {13}
const bus = new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});

bus.attachPermissions(["s3"]);
```

#### Attaching permissions for a specific target

Allow one of the targets to access S3.

```js {13}
const bus = new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});

bus.attachPermissionsToTarget("rule1", 0, ["s3"]);
```

Here we are referring to the rule using the rule key, `rule1`. 

### Configuring Queue targets

#### Specifying the Queue directly

You can directly pass in a [`Queue`](Queue.md).

```js {8}
const myQueue = new Queue(this, "MyQueue");

new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: myQueue
      },
    },
  },
});
```

#### Configuring the target

Configure the internally created CDK `Target`.

```js {9-11}
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: {
          queue: myQueue,
          cdk: {
            target: {
              messageGroupId: "group1",
            },
          },
        },
      },
    },
  },
});
```

### Receiving AWS events

When an AWS service in your account emits an event, it goes to your account’s default event bus.

```js {5-7}
import * as events from "aws-cdk-lib/aws-events";

new EventBus(stack, "Bus", {
  cdk: {
    eventBus: events.EventBus.fromEventBusName(
      this, "ImportedBus", "default"
    ),
  },
  rules: {
    rule1: {
      pattern: { source: ["aws.codebuild"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});
```

### Advanced examples

#### Configuring the EventBus

Configure the internally created CDK [`EventBus`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventBus.html) instance.

```js {3-5}
new EventBus(stack, "Bus", {
  cdk: {
    eventBus: {
      eventBusName: "MyEventBus",
    },
  },
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});
```

#### Importing an existing EventBus

Override the internally created CDK `EventBus` instance.

```js {5-7}
import * as events from "aws-cdk-lib/aws-events";

new EventBus(stack, "Bus", {
  cdk: {
    eventBus: events.EventBus.fromEventBusName(
      this, "ImportedBus", eventBusArn
    ),
  },
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/target1.main",
        myTarget2: "src/target2.main",
      },
    },
  },
});
```

#### Sharing an EventBus across stacks

You can create the EventBus construct in one stack, and add rules in other stacks. To do this, return the EventBus from the stack function

```ts title="stacks/MainStack.ts"
import { EventBus, App, StackContext } from "@serverless-stack/resources";

export function MainStack(ctx: StackContext) {
  const bus = new EventBus(ctx.stack, "Bus", {
    rules: {
      rule1: {
        pattern: { source: ["myevent"] },
        targets: {
          myTarget1: "src/target1.main",
          myTarget2: "src/target2.main",
        },
      },
    },
  });

  return {
    bus
  }
}
```

Then import the auth construct into another stack with `use` and call `addRules`. Note that the AWS resources for the added routes will be created in `AnotherStack`.

```ts title="stacks/AnotherStack.ts"
import { EventBus, StackContext } from "@serverless-stack/resources";
import { MainStack } from "./MainStack"

export function AnotherStack(ctx: StackContext) {
  const { bus } = use(MainStack);
  bus.addRules(ctx.stack, {
    rule2: {
      targets: {
        myTarget3: "src/target3.main",
        myTarget4: "src/target4.main",
      },
    },
  });
}
```

## EventBusProps



### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the Lambda functions in the EventBus. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.


```js
new EventBus(stack, "Bus", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```


### rules?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[EventBusRuleProps](#eventbusruleprops)</span>&gt;</span>

The rules for the eventbus


```js {5}
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget: "src/function.handler"
      },
    },
  },
});
```


### cdk.eventBus?

_Type_ : <span class='mono'><span class="mono">[IEventBus](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.IEventBus.html)</span> | <span class="mono">[EventBusProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventBusProps.html)</span></span>

Override the internally created EventBus


```js
new EventBus(stack, "Bus", {
  cdk: {
    eventBus: {
      eventBusName: "MyEventBus",
    },
  }
});
```


## Properties
An instance of `EventBus` has the following properties.
### eventBusArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created `EventBus` instance.

### eventBusName

_Type_ : <span class="mono">string</span>

The name of the internally created `EventBus` instance.


### cdk.eventBus

_Type_ : <span class="mono">[IEventBus](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.IEventBus.html)</span>

The internally created CDK `EventBus` instance.


## Methods
An instance of `EventBus` has the following methods.
### addRules

```ts
addRules(scope, rules)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __rules__ <span class="mono">Record&lt;<span class="mono">string</span>, <span class="mono">[EventBusRuleProps](#eventbusruleprops)</span>&gt;</span>


Add rules after the EventBus has been created.


```js
bus.addRules(stack, {
  rule2: {
    pattern: { source: ["myevent"] },
      targets: {
        myTarget3: "src/function3.handler"
        myTarget4: "src/function4.handler"
      },
  },
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Add permissions to all event targets in this EventBus.


```js {10}
bus.attachPermissions(["s3"]);
```

### attachPermissionsToTarget

```ts
attachPermissionsToTarget(ruleKey, targetName, permissions)
```
_Parameters_
- __ruleKey__ <span class="mono">string</span>
- __targetName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Add permissions to a specific event bus rule target


```js {10}
const bus = new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/function1.handler"
        myTarget2: "src/function2.handler"
      },
    },
  },
});

bus.attachPermissionsToTarget("rule1", 0, ["s3"]);
```

## EventBusRuleProps
Used to configure an EventBus rule





Fields to match on the detail field


```js
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { detail: { FOO: 1 }  },
    },
  },
});
```

### pattern.detailType?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

A list of detailTypes to filter on


```js
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { detailTypes: ["foo"]  },
    },
  },
});
```

### pattern.source?

_Type_ : <span class='mono'>Array&lt;<span class="mono">string</span>&gt;</span>

A list of sources to filter on


```js
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      pattern: { source: ["myevent"] },
    },
  },
});
```


### targets?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[Queue](Queue#queue)</span> | <span class="mono">[EventBusFunctionTargetProps](#eventbusfunctiontargetprops)</span> | <span class="mono">[EventBusQueueTargetProps](#eventbusqueuetargetprops)</span></span>&gt;</span>

Configure targets for this rule. Can be a function or queue


```js
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      targets: {
        myTarget1: "src/function.handler",
        myTarget2: new EventBus(stack, "MyQueue"),
      }
    },
  },
});
```


### cdk.rule?

_Type_ : <span class="mono">Omit&lt;<span class="mono">[RuleProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.RuleProps.html)</span>, <span class='mono'><span class="mono">"eventBus"</span> | <span class="mono">"targets"</span></span>&gt;</span>

Configure the internally created CDK `Rule` instance.


```js {5-8}
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      cdk: {
        rule: {
          ruleName: "my-rule",
          enabled: false,
        },
      },
      targets: {
        myTarget1: "test/lambda.handler",
      },
    },
  },
});
```


## EventBusQueueTargetProps


### queue

_Type_ : <span class="mono">[Queue](Queue#queue)</span>

The queue to trigger


```js
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      targets: {
        myTarget: {
          type: "queue",
          queue: new EventBus(stack, "Queue")
        }
      }
    },
  },
});
```

### type

_Type_ : <span class="mono">"queue"</span>

String literal to signify that the target is a queue


### cdk.target?

_Type_ : <span class="mono">[SqsQueueProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.SqsQueueProps.html)</span>


## EventBusFunctionTargetProps
Used to configure an EventBus function target

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function to trigger


```js
new EventBus(stack, "Bus", {
  rules: {
    rule1: {
      targets: {
        myTarget: { function: "src/function.handler" },
      }
    },
  },
});
```

### type?

_Type_ : <span class="mono">"function"</span>

String literal to signify that the target is a function


### cdk.target?

_Type_ : <span class="mono">[LambdaFunctionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunctionProps.html)</span>

