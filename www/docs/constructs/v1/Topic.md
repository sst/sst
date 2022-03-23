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

## Properties
An instance of `Topic` has the following properties.
### subscriberFunctions

_Type_ : Array< [`Function`](Function) >

A list of the internally created function instances for the subscribers.

### subscriptions

_Type_ : Array< [`Subscription`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Subscription.html) >

Get a list of subscriptions for this topic

### topicArn

_Type_ : `string`

The ARN of the internally created CDK `Topic` instance.

### topicName

_Type_ : `string`

The name of the internally created CDK `Topic` instance.


### cdk.topic

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)

The internally created CDK `Topic` instance.


## Methods
An instance of `Topic` has the following methods.
### addSubscribers

```ts
addSubscribers(scope: Construct, subscribers: unknown)
```
_Parameters_
- __scope__ [`Construct`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.Construct.html)
- __subscribers__ Array< [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`TopicQueueSubscriberProps`](#topicqueuesubscriberprops) >


Add subscribers to the topic.

#### Examples

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
topic.addSubscribers(this, ["src/subscriber3.main"]);
```

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```
_Parameters_
- __permissions__ [`Permissions`](Permissions)


Attaches the given list of permissions to all the subscriber functions. This allows the subscribers to access other AWS resources.

#### Examples


```js
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});
topic.attachPermissions(["s3"]);
```

### attachPermissionsToSubscriber

```ts
attachPermissionsToSubscriber(index: number, permissions: Permissions)
```
_Parameters_
- __index__ `number`
- __permissions__ [`Permissions`](Permissions)


Attaches the list of permissions to a given subscriber by index

#### Examples

```js {5}
const topic = new Topic(this, "Topic", {
  subscribers: ["src/subscriber1.main", "src/subscriber2.main"],
});

topic.attachPermissionsToSubscriber(0, ["s3"]);
```

## TopicProps



### defaults.function?

_Type_ : [`FunctionProps`](FunctionProps)

The default function props to be applied to all the consumers in the Topic. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.

#### Examples


```js
new Topic(props.stack, "Topic", {
  defaults: {
    function: {
      timeout: 20,
    }
  },
});
```


### subscribers?

_Type_ : Array< [`FunctionInlineDefinition`](FunctionInlineDefinition)&nbsp; | &nbsp;[`TopicFunctionSubscriberProps`](#topicfunctionsubscriberprops)&nbsp; | &nbsp;[`Queue`](Queue)&nbsp; | &nbsp;[`TopicQueueSubscriberProps`](#topicqueuesubscriberprops) >

A list of subscribers to create for this topic

#### Examples

```js
new Topic(this, "Topic", {
  subscribers: [
    "src/function1.handler",
    "src/function2.handler"
  ],
});
```


### cdk.topic?

_Type_ : [`ITopic`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.ITopic.html)&nbsp; | &nbsp;[`TopicProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.TopicProps.html)

Override the default settings this construct uses internally to create the topic.


## TopicQueueSubscriberProps
Used to define a queue subscriber for a topic

### Examples

```js
new Topic(props.stack, "Topic", {
  subscribers: [{
    queue: new Queue(this, "Queue", {
      consumer: "src/function.handler",
    })
  }]
})
```

### queue

_Type_ : [`Queue`](Queue)

The queue that'll be added as a subscriber to the topic.


### cdk.subscription?

_Type_ : [`SqsSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SqsSubscriptionProps.html)

This allows you to override the default settings this construct uses internally to create the subscriber.


## TopicFunctionSubscriberProps
Used to define a function subscriber for a topic

### Examples

```js
new Topic(props.stack, "Topic", {
  subscribers: [{
    function: "src/function.handler",
  }]
})
```

### function

_Type_ : [`FunctionDefinition`](FunctionDefinition)

Used to create the subscriber function for the topic


### cdk.subscription?

_Type_ : [`LambdaSubscriptionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.LambdaSubscriptionProps.html)

This allows you to override the default settings this construct uses internally to create the subscriber.

