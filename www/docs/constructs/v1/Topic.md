---
description: "Docs for the sst.Topic construct in the @serverless-stack/resources package"
---
The `Topic` construct is a higher level CDK construct that makes it easy to create a serverless pub/sub service. You can create a topic that has a list of subscribers. And you can publish messages to it from any part of your serverless app.

You can have two types of subscribers; Function subscribers (subscribe with a Lambda function) or Queue subscribers (subscribe with a SQS queue).

This construct makes it easier to define a topic and its subscribers. It also internally connects the subscribers and topic together.


## Constructor
```ts
new Topic(scope: Construct, id: string, props: TopicProps)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __id__ `string`
- __props__ [`TopicProps`](#topicprops)
## Examples

### Using the minimal config

```js
import { Topic } from "@serverless-stack/resources";

new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```


### Adding Function subscribers

Add subscribers after the topic has been created.

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.addSubscribers(this, ["src/subscriber3.main"]);
```

### Lazily adding Function subscribers

Create an _empty_ topic and lazily add the subscribers.

```js {3}
const topic = new Topic(this, "Topic");

topic.addSubscribers(this, ["src/subscriber1.main", "src/subscriber2.main"]);
```


### Giving the subscribers some permissions

Allow the subscriber functions to access S3.

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissions(["s3"]);
```


### Giving a specific subscriber some permissions

Allow the first subscriber function to access S3.

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissionsToSubscriber(0, ["s3"]);
```


### Specifying function props for all the subscribers


```js {3-7}
new Topic(this, "Topic", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  }
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```


### Configure each subscriber seperately

#### Using the full config
If you wanted to configure each Lambda function separately, you can pass in the [`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops).

```js
new Topic(this, "Topic", {
  subscribers: [{
    function: {
      srcPath: "src/",
      handler: "subscriber1.main",
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  }],
});
```

Note that, you can set the `defaultFunctionProps` while using the `function` per subscriber. The `function` will just override the `defaultFunctionProps`. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.

```js
new Topic(this, "Topic", {
  defaults: {
    function: {
      timeout: 20,
      environment: { tableName: table.tableName },
      permissions: [table],
    },
  }
  subscribers: [
    {
      function: {
        handler: "subscriber1.main",
        timeout: 10,
        environment: { bucketName: bucket.bucketName },
        permissions: [bucket],
      },
    },
    "subscriber2.main",
  ],
});
```

So in the above example, the `subscriber1` function doesn't use the `timeout` that is set in the `defaultFunctionProps`. It'll instead use the one that is defined in the function definition (`10 seconds`). And the function will have both the `tableName` and the `bucketName` environment variables set; as well as permissions to both the `table` and the `bucket`.


### Configuring Queue subscribers

#### Specifying the Queue directly

You can directly pass in an instance of the Queue construct.

```js {4}
const myQueue = new Queue(this, "MyQueue");

new Topic(this, "Topic", {
  subscribers: [myQueue],
});
```


### Creating a FIFO topic

```js {3-5}
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
  snsTopic: {
    fifo: true,
  },
});
```


### Configuring the SNS topic

Configure the internally created CDK `Topic` instance.

```js {3-5}
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
  snsTopic: {
    topicName: "my-topic",
  },
});
```

## Properties
An instance of `Topic` has the following properties.

### cdk.topic

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)

The internally created CDK `Topic` instance.


### snsSubscriptions

_Type_ : [`Subscription`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Subscription.html)

### subscriberFunctions

_Type_ : [`Function`](Function)

A list of the internally created function instances for the subscribers.

### topicArn

_Type_ : `string`

The ARN of the internally created CDK `Topic` instance.

### topicName

_Type_ : `string`

The name of the internally created CDK `Topic` instance.

## Methods
An instance of `Topic` has the following methods.
### addSubscribers

```ts
addSubscribers(scope: Construct, subscribers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __subscribers__ [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops)&nbsp; | &nbsp;[`TopicQueueSubscriberProps`](#topicqueuesubscriberprops)


Add subscribers to the topic.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of [permissions](../util/Permissions.md) to all the `subscriberFunctions`. This allows the subscribers to access other AWS resources.
Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToSubscriber

```ts
attachPermissionsToSubscriber(index: number, permissions: Permissions)
```
_Parameters_
- __index__ `number`
- __permissions__ [`Permissions`](Permissions)




## TopicFunctionSubscriberProps

### cdk.subscription

_Type_ : [`LambdaSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaSubscriptionProps.html)

This allows you to override the default settings this construct uses internally to create the subscriber.


### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

Used to create the subscriber function for the topic

## TopicProps

### cdk.topic

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)&nbsp; | &nbsp;[`TopicProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TopicProps.html)

Override the default settings this construct uses internally to create the topic.



### defaults.function

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the Lambda functions in the Topic. If the `function` is specified for a subscriber, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.


### subscribers

_Type_ : [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops)&nbsp; | &nbsp;[`TopicQueueSubscriberProps`](#topicqueuesubscriberprops)

A list of subscribers to create for this topic

## TopicQueueSubscriberProps

### cdk.subscription

_Type_ : [`SqsSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsSubscriptionProps.html)

This allows you to override the default settings this construct uses internally to create the subscriber.


### queue

_Type_ : [`Queue`](Queue)

The queue that'll be added as a subscriber to the topic.
