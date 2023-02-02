<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->

## Constructor
```ts
new EventBus(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[EventBusProps](#eventbusprops)</span>
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
    myRule: {
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

### cdk.id?

_Type_ : <span class="mono">string</span>

Allows you to override default id for this construct.


## Properties
An instance of `EventBus` has the following properties.
### eventBusArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created `EventBus` instance.

### eventBusName

_Type_ : <span class="mono">string</span>

The name of the internally created `EventBus` instance.

### id

_Type_ : <span class="mono">string</span>


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
  myRule2: {
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


```js
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


```js
const bus = new EventBus(stack, "Bus", {
  rules: {
    myRule: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/function1.handler"
        myTarget2: "src/function2.handler"
      },
    },
  },
});

bus.attachPermissionsToTarget("myRule", 0, ["s3"]);
```

### bind

```ts
bind(constructs)
```
_Parameters_
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to all event targets in this EventBus.


```js
bus.bind([STRIPE_KEY, bucket]);
```

### bindToTarget

```ts
bindToTarget(ruleKey, targetName, constructs)
```
_Parameters_
- __ruleKey__ <span class="mono">string</span>
- __targetName__ <span class="mono">string</span>
- __constructs__ <span class='mono'>Array&lt;<span class="mono">SSTConstruct</span>&gt;</span>


Binds the given list of resources to a specific event bus rule target


```js
const bus = new EventBus(stack, "Bus", {
  rules: {
    myRule: {
      pattern: { source: ["myevent"] },
      targets: {
        myTarget1: "src/function1.handler"
        myTarget2: "src/function2.handler"
      },
    },
  },
});

bus.bindToTarget("myRule", 0, [STRIPE_KEY, bucket]);
```

### getRule

```ts
getRule(key)
```
_Parameters_
- __key__ <span class="mono">string</span>


Get a rule


```js
bus.getRule("myRule");
```

## EventBusRuleProps
Used to configure an EventBus rule





Fields to match on the detail field


```js
new EventBus(stack, "Bus", {
  rules: {
    myRule: {
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
    myRule: {
      pattern: { detailType: ["foo"]  },
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
    myRule: {
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
    myRule: {
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
    myRule: {
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
    myRule: {
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

### function?

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

The function to trigger


```js
new EventBus(stack, "Bus", {
  rules: {
    myRule: {
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


### cdk.function?

_Type_ : <span class="mono">[IFunction](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.IFunction.html)</span>

### cdk.target?

_Type_ : <span class="mono">[LambdaFunctionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events_targets.LambdaFunctionProps.html)</span>

