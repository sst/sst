---
description: "Docs for the sst.Topic construct in the @serverless-stack/resources package. This construct creates an SNS Topic."
---

The `Topic` construct is a higher level CDK construct that makes it easy to create a serverless pub/sub service. You can create a topic that has a list of subscribers. And you can publish messages to it from any part of your serverless app.

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
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

### Adding subscribers

Add subscribers after topic was created.

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.addSubscribers(["src/subscriber3.main"]);
```

### Lazily adding subscribers

Add subscribers after topic was created.

```js {3}
const topic = new Topic(this, "Topic");

topic.addSubscribers(["src/subscriber1.main", "src/subscriber2.main"]);
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

### Configuring the SNS topic

Override the internally created CDK `Topic` instance.

```js {3-5}
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
  snsTopic: {
    topicName: "my-topic",
  },
});
```

### Configuring a subscriber

Override the internally created subscriber.

```js {4-10}
new Topic(this, "Topic", {
  subscribers: [
    {
      function: "src/subscriber1.main",
      subscriberProps: {
        filterPolicy: {
          color: sns.SubscriptionFilter.stringFilter({
            whitelist: ["red"],
          }),
        },
      },
    },
  ],
});
```

### Importing an existing topic

Override the internally created CDK `Topic` instance.

```js {3}
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
  snsTopic: sns.fromTopicArn(stack, "MySnsTopic", topicArn),
});
```

## Properties

An instance of `Topic` contains the following properties.

### snsTopic

_Type_ : [`cdk.aws-sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)

The internally created CDK `Topic` instance.

### subscriberFunctions

_Type_ : `Function[]`

A list of the internally created [`Function`](Function.md) instances for the subscribers.

## Methods

An instance of `Topic` contains the following methods.

### addSubscribers

```ts
addSubscribers(subscribers: (FunctionDefinition | TopicSubscriberProps)[])
```

_Parameters_

- **subscribers** `(FunctionDefinition | TopicSubscriberProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`TopicSubscriberProps`](#topicsubscriberprops) objects that'll be used to create the subscribers for the topic.

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

_Type_ : `(FunctionDefinition | TopicSubscriberProps)[]`, _defaults to_ `[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`TopicSubscriberProps`](#topicsubscriberprops) objects that'll be used to create the subscribers for the topic.

### snsTopic?

_Type_ : `cdk.aws-sns.Topic | cdk.aws-sns.TopicProps`], _defaults to_ `undefined`

_Type_ : , _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-sns.TopicProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.TopicProps.html) or a [`cdk.aws-sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html) instance. This allows you to override the default settings this construct uses internally to create the topic.

## TopicSubscriberProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) objects that'll be used to create the subscriber function for the topic.

### subscriberProps?

_Type_ : [`cdk.aws-sns-subscriptions.LambdaSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns-subscriptions.LambdaSubscriptionProps.html), _defaults to_ `undefined`

Or optionally pass in a CDK `LambdaSubscriptionProps`. This allows you to override the default settings this construct uses internally to create the subscriber.
