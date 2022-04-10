import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

### Configuring rules

#### Lazily adding rules

Add rules after the EventBus has been created.

```js
const bus = new EventBus(this, "Bus", {
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
new EventBus(this, "Bus", {
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
new EventBus(this, "Bus", {
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
new EventBus(this, "Bus", {
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

new EventBus(this, "Bus", {
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
const bus = new EventBus(this, "Bus", {
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
const bus = new EventBus(this, "Bus", {
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

new EventBus(this, "Bus", {
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
new EventBus(this, "Bus", {
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

new EventBus(this, "Bus", {
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
new EventBus(this, "Bus", {
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

new EventBus(this, "Bus", {
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

You can create the EventBus construct in one stack, and add rules in other stacks. To do this, expose the EventBus as a class property.

<MultiLanguageCode>
<TabItem value="js">

```js {7-14} title="stacks/MainStack.js"
import { EventBus, Stack } from "@serverless-stack/resources";

export class MainStack extends Stack {
  constructor(scope, id) {
    super(scope, id);

    this.bus = new EventBus(this, "Bus", {
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
  }
}
```

</TabItem>
<TabItem value="ts">

```js {4,9-16} title="stacks/MainStack.ts"
import { EventBus, App, Stack, StackProps } from "@serverless-stack/resources";

export class MainStack extends Stack {
  public readonly bus: EventBus;

  constructor(scope: App, id: string) {
    super(scope, id);

    this.bus = new EventBus(this, "Bus", {
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

new AnotherStack(app, "another", mainStack.bus);
```

</TabItem>
<TabItem value="ts">

```ts {3} title="stacks/index.ts"
const mainStack = new MainStack(app, "main");

new AnotherStack(app, "another", mainStack.bus);
```

</TabItem>
</MultiLanguageCode>

Finally, call `addRules`. Note that the AWS resources for the added routes will be created in `AnotherStack`.

<MultiLanguageCode>
<TabItem value="js">

```js title="stacks/AnotherStack.js"
import { Stack } from "@serverless-stack/resources";

export class AnotherStack extends Stack {
  constructor(scope, id, bus) {
    super(scope, id);

    bus.addRules(this, {
      rule2: {
        targets: {
          myTarget3: "src/target3.main",
          myTarget4: "src/target4.main",
        },
      },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```ts title="stacks/AnotherStack.ts"
import { EventBus, App, Stack } from "@serverless-stack/resources";

export class AnotherStack extends Stack {
  constructor(scope: App, id: string, bus: EventBus) {
    super(scope, id);

    bus.addRules(this, {
      rule2: {
        targets: {
          myTarget3: "src/target3.main",
          myTarget4: "src/target4.main",
        },
      },
    });
  }
}
```

</TabItem>
</MultiLanguageCode>
