---
description: "Docs for the sst.Topic construct in the @serverless-stack/resources package. This construct creates an SNS Topic."
---

The `Topic` construct is a higher level CDK construct that makes it easy to create a serverless pub/sub service. You can create a topic that has a list of subscribers. And you can publish messages to it from any part of your serverless app.

You can have two types of subscribers; Function subscribers (subscribe with a Lambda function) or Queue subscribers (subscribe with a SQS queue).

This construct makes it easier to define a topic and its subscribers. It also internally connects the subscribers and topic together.

## Initializer

```ts
new Topic(scope: Construct, id: string, props: TopicProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`TopicProps`](#topicprops)

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

### Configuring Function subscribers

#### Specifying function props for all the subscribers

You can extend the minimal config, to set some function props and have them apply to all the subscribers.

```js {2-6}
new Topic(this, "Topic", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

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

Note that, you can set the `defaultFunctionProps` while using the `function` per subscriber. The `function` will just override the `defaultFunctionProps`. Except for the `environment` and the `permissions` properties, that will be merged.

```js
new Topic(this, "Topic", {
  defaultFunctionProps: {
    timeout: 20,
    environment: { tableName: table.tableName },
    permissions: [table],
  },
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

#### Giving the subscribers some permissions

Allow the subscriber functions to access S3.

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissions(["s3"]);
```

#### Giving a specific subscriber some permissions

Allow the first subscriber function to access S3.

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissionsToSubscriber(0, ["s3"]);
```

#### Configuring the subscription

Configure the internally created CDK `Subscription`.

```js {5-14}
import { SubscriptionFilter } from "@aws-cdk/aws-sns";

new Topic(this, "Topic", {
  subscribers: [
    {
      function: "src/subscriber1.main",
      subscriberProps: {
        filterPolicy: {
          color: SubscriptionFilter.stringFilter({
            whitelist: ["red"],
          }),
        },
      },
    },
  ],
});
```

### Configuring Queue subscribers

#### Specifying the Queue directly

You can directly pass in an instance of the Queue construct.

```js {4}
const myQueue = new Queue(this, "MyQueue");

new Topic(this, "Topic", {
  subscribers: [myQueue],
});
```

#### Configuring the subscription

Configure the internally created CDK `Subscription`.

```js {7-16}
import { SubscriptionFilter } from "@aws-cdk/aws-sns";

const myQueue = new Queue(this, "MyQueue");

new Topic(this, "Topic", {
  subscribers: [
    {
      queue: myQueue,
      subscriberProps: {
        filterPolicy: {
          color: SubscriptionFilter.stringFilter({
            whitelist: ["red"],
          }),
        },
      },
    },
  ],
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

### Importing an existing topic

Override the internally created CDK `Topic` instance.

```js {5}
import { Topic } from "@aws-cdk/aws-sns";

new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
  snsTopic: Topic.fromTopicArn(this, "MySnsTopic", topicArn),
});
```

## Properties

An instance of `Topic` contains the following properties.

### topicArn

_Type_: `string`

The ARN of the internally created CDK `Topic` instance.

### topicName

_Type_: `string`

The name of the internally created CDK `Topic` instance.

### snsTopic

_Type_ : [`cdk.aws-sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)

The internally created CDK `Topic` instance.

### snsSubscriptions

_Type_ : [`cdk.aws-sns.Subscription`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Subscription.html)

A list of the internally created CDK `Subscription` instances.

### subscriberFunctions

_Type_ : `Function[]`

A list of the internally created [`Function`](Function.md) instances for the subscribers.

## Methods

An instance of `Topic` contains the following methods.

### addSubscribers

```ts
addSubscribers(scope: cdk.Construct, subscribers: (FunctionDefinition | TopicFunctionSubscriberProps | Queue | TopicQueueSubscriberProps)[])
```

_Parameters_

- **scope** `cdk.Construct`
- **subscribers** `(FunctionDefinition | TopicFunctionSubscriberProps | Queue | TopicQueueSubscriberProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition), [`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops), [`Queue`](Queue.md), or [`TopicQueueSubscriberProps`](#topicqueuesubscriberprops) objects that'll be used to add the subscribers for the topic.

Use `FunctionDefinition` or `TopicFunctionSubscriberProps` to add a Lambda function subscriber.

Or, use `Queue` or `TopicQueueSubscriberProps` to add a Queue subscriber.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the `subscriberFunctions`. This allows the subscribers to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToSubscriber

```ts
attachPermissions(index: number, permissions: Permissions)
```

_Parameters_

- **index** `number`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific function in the list of `subscriberFunctions`. Where `index` (starting at 0) is used to identify the subscriber. This allows that subscriber to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## TopicProps

### subscribers?

_Type_ : `(FunctionDefinition | TopicFunctionSubscriberProps | Queue | TopicQueueSubscriberProps)[]`, _defaults to_ `[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition), [`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops), [`Queue`](Queue.md), or [`TopicQueueSubscriberProps`](#topicqueuesubscriberprops) objects that'll be used to add the subscribers for the topic.

Use `FunctionDefinition` or `TopicFunctionSubscriberProps` to add a Lambda function subscriber.

Or, use `Queue` or `TopicQueueSubscriberProps` to add a Queue subscriber.

### snsTopic?

_Type_ : `cdk.aws-sns.Topic | cdk.aws-sns.TopicProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-sns.TopicProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.TopicProps.html) or a [`cdk.aws-sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html) instance. This allows you to override the default settings this construct uses internally to create the topic.

### defaultFunctionProps?

_Type_ : [`FunctionProps`](Function.md#functionprops), _defaults to_ `{}`

The default function props to be applied to all the Lambda functions in the Topic. If the `function` is specified for a subscriber, these default values are overridden. Except for the `environment` and the `permissions` properties, that will be merged.

## TopicFunctionSubscriberProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the subscriber function for the topic.

### subscriberProps?

_Type_ : [`cdk.aws-sns-subscriptions.LambdaSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns-subscriptions.LambdaSubscriptionProps.html), _defaults to_ `undefined`

Or optionally pass in a CDK `LambdaSubscriptionProps`. This allows you to override the default settings this construct uses internally to create the subscriber.

## TopicQueueSubscriberProps

### queue

_Type_ : `Queue`

The [`Queue`](Queue.md) construct that'll be added as a subscriber to the topic.

### subscriberProps?

_Type_ : [`cdk.aws-sns-subscriptions.SqsSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns-subscriptions.SqsSubscriptionProps.html), _defaults to_ `undefined`

Or optionally pass in the CDK `SqsSubscriptionProps`. This allows you to override the default settings this construct uses internally to create the subscriber.
