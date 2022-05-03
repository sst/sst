---
description: "Docs for the sst.Topic construct in the @serverless-stack/resources package"
---
<!--
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                           !!
!!  This file has been automatically generated, do not edit  !!
!!                                                           !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-->
The `Topic` construct is a higher level CDK construct that makes it easy to create a serverless pub/sub service. You can create a topic that has a list of subscribers. And you can publish messages to it from any part of your serverless app.

You can have two types of subscribers; Function subscribers (subscribe with a Lambda function) or Queue subscribers (subscribe with a SQS queue).

This construct makes it easier to define a topic and its subscribers. It also internally connects the subscribers and topic together.


## Constructor
```ts
new Topic(scope, id, props)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __id__ <span class="mono">string</span>
- __props__ <span class="mono">[TopicProps](#topicprops)</span>

## Examples

### Using the minimal config

```js
import { Topic } from "@serverless-stack/resources";

new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
```


### Configuring subscribers

#### Lazily adding subscribers

Add subscribers after the topic has been created.

```js {8-10}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
});

topic.addSubscribers(this, {
  subscriber3: "src/subscriber3.main",
});
```

### Configuring Function subscribers

#### Specifying function props for all the subscribers

You can extend the minimal config, to set some function props and have them apply to all the subscribers.

```js {3-7}
new Topic(stack, "Topic", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
});
```

#### Configuring an individual subscriber

Configure each Lambda function separately.

```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber: {
      function: {
        srcPath: "src/",
        handler: "subscriber1.main",
        environment: { tableName: table.tableName },
        permissions: [table],
      },
    },
  },
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per subscriber. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Topic(stack, "Topic", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  },
  subscribers: {
    subscriber1: {
      function: {
        handler: "subscriber1.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
    },
    subscriber2: "subscriber2.main",
  },
});
```

So in the above example, the `subscriber1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.

#### Giving the subscribers some permissions

Allow the subscriber functions to access S3.

```js {8}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
});

topic.attachPermissions(["s3"]);
```

#### Giving a specific subscriber some permissions

Allow the first subscriber function to access S3.

```js {8}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
});

topic.attachPermissionsToSubscriber("subscriber1", ["s3"]);
```

#### Configuring the subscription

Configure the internally created CDK `Subscription`.

```js {8-14}
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";

new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: {
      function: "src/subscriber1.main",
      cdk: {
        subscription: {
          filterPolicy: {
            color: SubscriptionFilter.stringFilter({
              allowlist: ["red"],
            }),
          },
        },
      },
    },
  },
});
```

### Configuring Queue subscribers

#### Specifying the Queue directly

You can directly pass in an instance of the Queue construct.

```js {5}
const myQueue = new Queue(this, "MyQueue");

new Topic(stack, "Topic", {
  subscribers: {
    subscriber: myQueue
  },
});
```

#### Configuring the subscription

Configure the internally created CDK `Subscription`.

```js {10-16}
import { SubscriptionFilter } from "aws-cdk-lib/aws-sns";

const myQueue = new Queue(this, "MyQueue");

new Topic(stack, "Topic", {
  subscribers: {
    subscriber: {
      queue: myQueue,
      cdk: {
        subscription: {
          filterPolicy: {
            color: SubscriptionFilter.stringFilter({
              allowlist: ["red"],
            }),
          },
        },
      },
    },
  },
});
```

### FIFO topic

```js {7-9}
new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
  cdk: {
    topic: {
      fifo: true,
    },
  },
});
```

### Advanced examples

#### Configuring the SNS Topic

Configure the internally created CDK `Topic` instance.

```js {7-9}
new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
  cdk: {
    topic: {
      topicName: "my-topic",
    },
  },
});
```

#### Importing an existing Topic

Override the internally created CDK `Topic` instance.

```js {9}
import * as sns from "aws-cdk-lib/aws-sns";

new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/subscriber1.main",
    subscriber2: "src/subscriber2.main",
  },
  cdk: {
    topic: sns.Topic.fromTopicArn(this, "MySnsTopic", topicArn),
  },
});
```

## TopicProps



### defaults.function?

_Type_ : <span class="mono">[FunctionProps](Function#functionprops)</span>

The default function props to be applied to all the consumers in the Topic. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.



```js
new Topic(stack, "Topic", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```


### subscribers?

_Type_ : <span class="mono">Record&lt;<span class="mono">string</span>, <span class='mono'><span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span></span> | <span class="mono">[TopicQueueSubscriberProps](#topicqueuesubscriberprops)</span> | <span class="mono">[Queue](Queue#queue)</span> | <span class="mono">[TopicFunctionSubscriberProps](#topicfunctionsubscriberprops)</span></span>&gt;</span>

Configure subscribers for this topic


```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
```


### cdk.topic?

_Type_ : <span class='mono'><span class="mono">[ITopic](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.ITopic.html)</span> | <span class="mono">[TopicProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.TopicProps.html)</span></span>

Override the default settings this construct uses internally to create the topic.


## Properties
An instance of `Topic` has the following properties.
### subscriberFunctions

_Type_ : <span class='mono'>Array&lt;<span class="mono">[Function](Function#function)</span>&gt;</span>

A list of the internally created function instances for the subscribers.

### subscriptions

_Type_ : <span class='mono'>Array&lt;<span class="mono">[Subscription](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Subscription.html)</span>&gt;</span>

Get a list of subscriptions for this topic

### topicArn

_Type_ : <span class="mono">string</span>

The ARN of the internally created SNS Topic.

### topicName

_Type_ : <span class="mono">string</span>

The name of the internally created SNS Topic.


### cdk.topic

_Type_ : <span class="mono">[ITopic](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.ITopic.html)</span>

The internally created CDK `Topic` instance.


## Methods
An instance of `Topic` has the following methods.
### addSubscribers

```ts
addSubscribers(scope, subscribers)
```
_Parameters_
- __scope__ <span class="mono">[Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)</span>
- __subscribers__ 



Add subscribers to the topic.


```js {5}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
topic.addSubscribers(stack, {
  subscriber3: "src/function3.handler"
});
```

### attachPermissions

```ts
attachPermissions(permissions)
```
_Parameters_
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the given list of permissions to all the subscriber functions. This allows the subscribers to access other AWS resources.



```js
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});
topic.attachPermissions(["s3"]);
```

### attachPermissionsToSubscriber

```ts
attachPermissionsToSubscriber(subscriberName, permissions)
```
_Parameters_
- __subscriberName__ <span class="mono">string</span>
- __permissions__ <span class="mono">[Permissions](Permissions)</span>


Attaches the list of permissions to a given subscriber by index


```js {5}
const topic = new Topic(stack, "Topic", {
  subscribers: {
    subscriber1: "src/function1.handler",
    subscriber2: "src/function2.handler"
  },
});

topic.attachPermissionsToSubscriber("subscriber1", ["s3"]);
```

## TopicQueueSubscriberProps
Used to define a queue subscriber for a topic


```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber: {
      type: "queue",
      queue: new Queue(stack, "Queue", {
        consumer: "src/function.handler"
      })
    }
  }
})
```

### queue

_Type_ : <span class="mono">[Queue](Queue#queue)</span>

The queue that'll be added as a subscriber to the topic.

### type

_Type_ : <span class="mono">"queue"</span>

String literal to signify that the subscriber is a queue


### cdk.subscription?

_Type_ : <span class="mono">[SqsSubscriptionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.SqsSubscriptionProps.html)</span>

This allows you to override the default settings this construct uses internally to create the subscriber.


## TopicFunctionSubscriberProps
Used to define a function subscriber for a topic


```js
new Topic(stack, "Topic", {
  subscribers: {
    subscriber: "src/function.handler"
  }
})
```

### function

_Type_ : <span class='mono'><span class="mono">string</span> | <span class="mono">[Function](Function#function)</span> | <span class="mono">[FunctionProps](Function#functionprops)</span></span>

Used to create the subscriber function for the topic

### type?

_Type_ : <span class="mono">"function"</span>

String literal to signify that the subscriber is a function


### cdk.subscription?

_Type_ : <span class="mono">[LambdaSubscriptionProps](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.LambdaSubscriptionProps.html)</span>

This allows you to override the default settings this construct uses internally to create the subscriber.

