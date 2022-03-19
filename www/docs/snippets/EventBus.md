---
description: "Snippets for the sst.EventBus construct"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

The `EventBus` construct is designed to make it easy to get started with, while allowing for a way to fully configure it as well. Let's look at how, through a couple of examples.

## Using the minimal config

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

## Adding rules

Add rules after the EventBus has been created.

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

## Lazily adding rules

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

## Configuring Function targets

### Specifying the function path

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

### Specifying function props

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

### Specifying function props for all targets

You can extend the minimal config, to set some function props and have them apply to all the rules.

```js {2-6}
new EventBus(this, "Bus", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per target. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new EventBus(this, "Bus", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
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

### Configuring the target

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

## Configuring Queue targets

### Specifying the Queue directly

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

### Configuring the target

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

## Configuring the EventBus

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

## Configuring the Rule

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

## Importing an existing EventBus

Override the internally created CDK `EventBus` instance.

```js {4-6}
import * as events from "aws-cdk-lib/aws-events";

new EventBus(this, "Bus", {
  eventBridgeEventBus: events.EventBus.fromEventBusArn(
    this, "ImportedBus", eventBusArn
  ),
  rules: {
    rule1: {
      eventPattern: { source: ["myevent"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

## Receiving AWS events

When an AWS service in your account emits an event, it goes to your account’s default event bus.

```js {4-6}
import * as events from "aws-cdk-lib/aws-events";

new EventBus(this, "Bus", {
  eventBridgeEventBus: events.EventBus.fromEventBusName(
    this, "ImportedBus", "default"
  ),
  rules: {
    rule1: {
      eventPattern: { source: ["aws.codebuild"] },
      targets: ["src/target1.main", "src/target2.main"],
    },
  },
});
```

## Sharing an EventBus across stacks

You can create the EventBus construct in one stack, and add rules in other stacks. To do this, expose the EventBus as a class property.

<MultiLanguageCode>
<TabItem value="js">

```js {7-14} title="stacks/MainStack.js"
import { EventBus, Stack } from "@serverless-stack/resources";

export class MainStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    this.bus = new EventBus(this, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["myevent"] },
          targets: ["src/target1.main", "src/target2.main"],
        },
      },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```js {4,9-16} title="stacks/MainStack.ts"
import { EventBus, App, Stack, StackProps } from "@serverless-stack/resources";

export class MainStack extends Stack {
  public readonly bus: EventBus;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    this.bus = new EventBus(this, "Bus", {
      rules: {
        rule1: {
          eventPattern: { source: ["myevent"] },
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

```js {3} title="stacks/index.js"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", { bus: mainStack.bus });
```

</TabItem>
<TabItem value="ts">

```ts {3} title="stacks/index.ts"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", { bus: mainStack.bus });
```

</TabItem>
</MultiLanguageCode>

Finally, call `addRules`. Note that the AWS resources for the added routes will be created in `AnotherStack`.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/AnotherStack.js"
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

```ts title="stacks/AnotherStack.ts"
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
