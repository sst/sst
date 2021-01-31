---
id: Topic
title: "Topic"
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

## Properties

An instance of `Topic` contains the following properties.

### snsTopic

_Type_ : [`cdk.aws-sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html)

The internally created CDK `Topic` instance.

### subscriberFunctions

_Type_ : Function[]

A list of the internally created [`Function`](function.md) instances for the subscribers.

## Methods

An instance of `Queue` contains the following methods.

### attachPermissions

```ts
attachPermissions(permissions: FunctionPermissions)
```

_Parameters_

- **permissions** [`FunctionPermissions`](function.md#functionpermissions)

Attaches the given list of [permissions](function.md#functionpermissions) to all the `subscriberFunctions`. This allows the subscribers to access other AWS resources.

Internally calls [`Function.attachPermissions`](function.md#attachpermissions).

### attachPermissionsToSubscriber

```ts
attachPermissions(index: number, permissions: FunctionPermissions)
```

_Parameters_

- **index** `number`

- **permissions** [`FunctionPermissions`](function.md#functionpermissions)

Attaches the given list of [permissions](function.md#functionpermissions) to a specific function in the list of `subscriberFunctions`. Where `index` (starting at 0) is used to identity the subscriber. This allows that subscriber to access other AWS resources.

Internally calls [`Function.attachPermissions`](function.md#attachpermissions).

## TopicProps

### subscribers

_Type_ : `FunctionDefinition[]`

A list of [`FunctionDefinition`](function.md#functiondefinition) objects that'll be used to create the subscriber functions for the topic.

### snsTopic?

_Type_ : [`cdk.aws-sns.Topic`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-sns.Topic.html), _defaults to_ `undefined`

Or optionally pass in a CDK `Topic` instance. This allows you to override the default settings this construct uses internally to create the topci.

## Examples

### Using the minimal config

```js
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
```

### Manually creating the topic

Override the internally created CDK `Topic` instance.

```js
new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
  snsTopic:
    new cdk.aws() -
    sns.Topic(stack, "MySnsTopic", {
      topicName: "my-topic",
    }),
});
```

### Giving the subscribers some permissions

Allow the subscriber functions to access S3.

```js {8}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissions(["s3"]);
```

### Giving a specific subscriber some permissions

Allow the first subscriber function to access S3.

```js {8}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissionsToSubscriber(0, ["s3"]);
```
